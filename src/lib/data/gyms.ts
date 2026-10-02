// Gym profiles and equipment, local-first through the repositories. Every change saves at once
// (D-040), so edits are never lost and work offline.
import type { LocalDb } from './db';
import { del, list, put } from './repo';
import type { LocalRow } from './tables';
import type { CatalogItem } from '$lib/domain/catalog';
import {
	assumeFullFor,
	DEFAULT_WEIGHTS,
	orderGyms,
	type GymKind,
	type Weights
} from '$lib/domain/equipment';

export type GymRow = LocalRow<'gym_profiles'>;
export type ItemRow = LocalRow<'gym_equipment'>;

// Patch only the given fields: put() merges them into the stored row in one transaction.
const patchGym = (db: LocalDb, id: string, fields: Partial<GymRow>) =>
	put(db, 'gym_profiles', { id, ...fields } as GymRow);
const patchItem = (db: LocalDb, id: string, fields: Partial<ItemRow>) =>
	put(db, 'gym_equipment', { id, ...fields } as ItemRow);

export async function loadGyms(db: LocalDb) {
	const [gyms, items] = await Promise.all([list(db, 'gym_profiles'), list(db, 'gym_equipment')]);
	return { gyms: orderGyms(gyms), items };
}

/** True once this device has finished a sync (its first pull), so it knows the server's gyms. */
export const hasSynced = async (db: LocalDb) => !!(await db.get('meta', 'sync'));

/**
 * Create the default "Home" gym, but only after the first pull (ARCHITECTURE §5): before that,
 * the member's gyms may simply not have arrived yet, and a second "Home" would be created.
 */
export function ensureDefaultGym(db: LocalDb, userId: string): Promise<void> {
	// One check-and-create at a time: screens re-run this on every sync bump, and two overlapping
	// runs would both see no gyms and create two "Home"s.
	ensuring ??= (async () => {
		if (!(await hasSynced(db)) || (await list(db, 'gym_profiles')).length) return;
		await addGym(db, userId, { name: 'Home', kind: 'home' });
	})().finally(() => (ensuring = null));
	return ensuring;
}
let ensuring: Promise<void> | null = null;

export async function addGym(
	db: LocalDb,
	userId: string,
	g: { name: string; kind: GymKind }
): Promise<GymRow> {
	const first = !(await list(db, 'gym_profiles')).length;
	return put(db, 'gym_profiles', {
		id: crypto.randomUUID(),
		user_id: userId,
		name: g.name.trim(),
		kind: g.kind,
		assume_full: assumeFullFor(g.kind),
		is_default: first,
		up: 0,
		deleted: false
	});
}

export const updateGym = (
	db: LocalDb,
	id: string,
	fields: Partial<Pick<GymRow, 'name' | 'kind' | 'assume_full'>>
) => patchGym(db, id, fields);

export async function makeDefault(db: LocalDb, gyms: GymRow[], id: string) {
	for (const g of gyms)
		if (g.is_default !== (g.id === id)) await patchGym(db, g.id, { is_default: g.id === id });
}

/** Soft-delete a gym and its equipment (a cascade only runs on hard deletes); keep a default. */
export async function deleteGym(db: LocalDb, gyms: GymRow[], items: ItemRow[], gym: GymRow) {
	for (const item of items)
		if (item.gym_profile_id === gym.id) await del(db, 'gym_equipment', item.id);
	await del(db, 'gym_profiles', gym.id);
	const next = gyms.find((g) => g.id !== gym.id);
	if (gym.is_default && next) await patchGym(db, next.id, { is_default: true });
}

/**
 * Tick or untick a catalogue item. Unticking soft-deletes it; ticking again revives that row, so
 * its weights come back. Capabilities come from the catalogue (the server enforces it too).
 */
export async function setCatalogItem(
	db: LocalDb,
	userId: string,
	gymId: string,
	item: CatalogItem,
	on: boolean
) {
	const rows = (await db.getAllFromIndex('gym_equipment', 'gym_profile_id', gymId)) as ItemRow[];
	// Two offline devices can each tick the same item, so there may be several rows for it.
	const matches = rows.filter((r) => r.catalog_id === item.id);
	const live = matches.filter((r) => !r.deleted);
	if (!on) {
		for (const r of live) await del(db, 'gym_equipment', r.id);
		return;
	}
	if (live.length) return;
	if (matches.length) {
		await patchItem(db, matches[0].id, { deleted: false });
		return;
	}
	await put(db, 'gym_equipment', {
		id: crypto.randomUUID(),
		user_id: userId,
		gym_profile_id: gymId,
		catalog_id: item.id,
		custom_name: null,
		capabilities: item.capabilities,
		weights: DEFAULT_WEIGHTS[item.id] ?? null,
		up: 0,
		deleted: false
	});
}

export const setWeights = (db: LocalDb, id: string, weights: Weights) =>
	patchItem(db, id, { weights });

/** Add or edit custom kit: a name and the capabilities it counts as (≥ 1, D-035). */
export async function saveCustom(
	db: LocalDb,
	userId: string,
	gymId: string,
	c: { id?: string; name: string; capabilities: string[] }
) {
	if (c.id)
		return patchItem(db, c.id, { custom_name: c.name.trim(), capabilities: c.capabilities });
	return put(db, 'gym_equipment', {
		id: crypto.randomUUID(),
		user_id: userId,
		gym_profile_id: gymId,
		catalog_id: null,
		custom_name: c.name.trim(),
		capabilities: c.capabilities,
		weights: null,
		up: 0,
		deleted: false
	});
}

export const removeItem = (db: LocalDb, id: string) => del(db, 'gym_equipment', id);
