// Progress photos: the row syncs like any table; the image lives in the device's `blobs` store and in
// the private Storage bucket `photos/{user_id}/{id}.jpg` (ARCHITECTURE §5, same approach as v3).
import type { SupabaseClient } from '@supabase/supabase-js';
import { fitWithin, type Pose } from '$lib/domain/body';
import type { LocalDb } from './db';
import { del, put } from './repo';
import type { LocalRow } from './tables';

export type PhotoRow = LocalRow<'photos'>;

/** What blob sync needs from Storage (Supabase in the app, a fake in tests). */
export interface PhotoStorage {
	upload(path: string, blob: Blob): Promise<void>;
	download(path: string): Promise<Blob | null>;
	remove(path: string): Promise<void>;
}

export function supabaseStorage(sb: SupabaseClient): PhotoStorage {
	const bucket = () => sb.storage.from('photos');
	return {
		async upload(path, blob) {
			const { error } = await bucket().upload(path, blob, {
				upsert: true,
				contentType: blob.type || 'image/jpeg'
			});
			if (error) throw error;
		},
		async download(path) {
			const { data, error } = await bucket().download(path);
			if (error) return null;
			return data;
		},
		async remove(path) {
			const { error } = await bucket().remove([path]);
			if (error) throw error;
		}
	};
}

/** Shrink a camera photo to fit 1280 px as a JPEG (v3 compressImage: quality 0.82). Browser only. */
export async function compressImage(file: Blob): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const { w, h } = fitWithin(bitmap.width, bitmap.height);
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
	bitmap.close();
	return new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82));
}

export async function addPhoto(
	db: LocalDb,
	userId: string,
	p: { blob: Blob; takenOn: string; pose: Pose; note: string }
): Promise<PhotoRow> {
	const id = crypto.randomUUID();
	await db.put('blobs', p.blob, id); // image first, so a row never points at nothing on this device
	return put(db, 'photos', {
		id,
		user_id: userId,
		taken_on: p.takenOn,
		storage_path: `${userId}/${id}.jpg`,
		pose: p.pose,
		note: p.note.trim() || null,
		remote: false,
		checkin_id: null,
		up: 0,
		deleted: false
	});
}

export const getBlob = (db: LocalDb, id: string) =>
	db.get('blobs', id) as Promise<Blob | undefined>;

/** Soft-delete the photo; its image leaves this device now and Storage on the next blob sync. */
export async function deletePhoto(db: LocalDb, photo: PhotoRow) {
	await del(db, 'photos', photo.id);
	await db.delete('blobs', photo.id);
}

/**
 * Move images between this device and Storage, at most `limit` transfers per round (v3: 6):
 * upload new local images (then mark the row remote), download images other devices uploaded,
 * and remove deleted photos' images. Returns how many images changed on this device.
 */
export async function syncPhotoBlobs(
	db: LocalDb,
	storage: PhotoStorage,
	limit = 6
): Promise<number> {
	const rows = (await db.getAll('photos')) as PhotoRow[];
	let budget = limit;
	let changed = 0;
	for (const p of rows) {
		if (budget <= 0) break;
		const local = await getBlob(db, p.id);
		if (p.deleted) {
			if (local) {
				await db.delete('blobs', p.id);
				changed++;
			}
			if (p.remote) {
				budget--;
				await storage.remove(p.storage_path);
				await put(db, 'photos', { ...p, remote: false });
			}
		} else if (local && !p.remote) {
			budget--;
			await storage.upload(p.storage_path, local);
			await put(db, 'photos', { ...p, remote: true });
		} else if (!local && p.remote) {
			budget--;
			const blob = await storage.download(p.storage_path);
			if (blob) {
				await db.put('blobs', blob, p.id);
				changed++;
			}
		}
	}
	return changed;
}
