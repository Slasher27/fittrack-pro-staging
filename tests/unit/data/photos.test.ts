import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openLocalDb } from '$lib/data/db';
import {
	addPhoto,
	deletePhoto,
	getBlob,
	syncPhotoBlobs,
	type PhotoStorage
} from '$lib/data/photos';
import { get, list, put } from '$lib/data/repo';
import { syncOnce } from '$lib/data/sync';
import { FakeServer } from './fake-server';

const USER = 'aaaaaaaa-0000-0000-0000-000000000001';
let n = 0;

class FakeStorage implements PhotoStorage {
	files = new Map<string, Blob>();
	async upload(path: string, blob: Blob) {
		this.files.set(path, blob);
	}
	async download(path: string) {
		return this.files.get(path) ?? null;
	}
	async remove(path: string) {
		this.files.delete(path);
	}
}

const jpeg = (text: string) => new Blob([text], { type: 'image/jpeg' });

describe('photo blob sync', () => {
	it('uploads, reaches another device, and deletion removes it everywhere', async () => {
		const server = new FakeServer();
		const storage = new FakeStorage();
		const a = await openLocalDb(`${USER}-ph-${++n}`);
		const b = await openLocalDb(`${USER}-ph-${++n}`);
		const t = server.transport();

		const p = await addPhoto(a, USER, {
			blob: jpeg('front-1'),
			takenOn: '2026-10-01',
			pose: 'Front',
			note: ' fasted '
		});
		expect(p.storage_path).toBe(`${USER}/${p.id}.jpg`);
		expect(p.note).toBe('fasted');

		await syncOnce(a, t);
		expect(await syncPhotoBlobs(a, storage)).toBe(0); // uploaded, nothing changed locally
		expect(storage.files.has(p.storage_path)).toBe(true);
		expect((await get(a, 'photos', p.id))?.remote).toBe(true);
		await syncOnce(a, t); // push remote = true

		await syncOnce(b, t);
		expect(await getBlob(b, p.id)).toBeUndefined();
		expect(await syncPhotoBlobs(b, storage)).toBe(1); // downloaded
		expect(await (await getBlob(b, p.id))!.text()).toBe('front-1');

		await deletePhoto(b, (await get(b, 'photos', p.id))!);
		expect(await getBlob(b, p.id)).toBeUndefined();
		await syncPhotoBlobs(b, storage);
		expect(storage.files.size).toBe(0);
		await syncOnce(b, t);
		await syncOnce(a, t);
		expect(await list(a, 'photos')).toEqual([]);
		expect(await syncPhotoBlobs(a, storage)).toBe(1); // A drops its copy
		expect(await getBlob(a, p.id)).toBeUndefined();
	});

	it('moves at most `limit` images per round and keeps going next round', async () => {
		const storage = new FakeStorage();
		const db = await openLocalDb(`${USER}-ph-${++n}`);
		for (let i = 0; i < 8; i++)
			await addPhoto(db, USER, {
				blob: jpeg(`p${i}`),
				takenOn: '2026-10-01',
				pose: 'Side',
				note: ''
			});
		await syncPhotoBlobs(db, storage);
		expect(storage.files.size).toBe(6);
		await syncPhotoBlobs(db, storage);
		expect(storage.files.size).toBe(8);
	});

	it('a delete or note edit made during the upload is kept', async () => {
		const storage = new FakeStorage();
		const db = await openLocalDb(`${USER}-ph-${++n}`);
		const opts = { takenOn: '2026-10-01', pose: 'Front' as const, note: '' };
		const kept = await addPhoto(db, USER, { ...opts, blob: jpeg('a') });
		const gone = await addPhoto(db, USER, { ...opts, blob: jpeg('b') });
		const upload = storage.upload.bind(storage);
		storage.upload = async (path, blob) => {
			await upload(path, blob);
			if (path === kept.storage_path) await put(db, 'photos', { ...kept, note: 'edited' });
			else await deletePhoto(db, gone);
		};
		await syncPhotoBlobs(db, storage);
		const k = await get(db, 'photos', kept.id);
		expect(k?.note).toBe('edited');
		expect(k?.remote).toBe(true);
		expect(await get(db, 'photos', gone.id)).toBeUndefined();
		await syncPhotoBlobs(db, storage); // the uploaded image of the deleted photo is removed
		expect(storage.files.has(gone.storage_path)).toBe(false);
	});

	it('keeps the image when the upload fails, and retries', async () => {
		const storage = new FakeStorage();
		const db = await openLocalDb(`${USER}-ph-${++n}`);
		const p = await addPhoto(db, USER, {
			blob: jpeg('x'),
			takenOn: '2026-10-01',
			pose: 'Back',
			note: ''
		});
		const upload = storage.upload.bind(storage);
		storage.upload = async () => {
			throw new Error('offline');
		};
		await expect(syncPhotoBlobs(db, storage)).rejects.toThrow('offline');
		expect((await get(db, 'photos', p.id))?.remote).toBe(false);
		expect(await getBlob(db, p.id)).toBeDefined();
		storage.upload = upload;
		await syncPhotoBlobs(db, storage);
		expect((await get(db, 'photos', p.id))?.remote).toBe(true);
	});
});
