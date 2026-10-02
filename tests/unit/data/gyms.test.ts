import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openLocalDb } from '$lib/data/db';
import {
	addGym,
	deleteGym,
	ensureDefaultGym,
	loadGyms,
	makeDefault,
	saveCustom,
	setCatalogItem,
	setWeights,
	updateGym
} from '$lib/data/gyms';
import { get, put } from '$lib/data/repo';
import { catalogItem } from '$lib/domain/catalog';
import { capabilities } from '$lib/domain/equipment';

const USER = 'aaaaaaaa-0000-0000-0000-000000000001';
let n = 0;
const fresh = () => openLocalDb(`${USER}-gym-${++n}`);

describe('gym profiles on the device', () => {
	it('creates "Home" only after the first pull, and only once', async () => {
		const db = await fresh();
		await ensureDefaultGym(db, USER);
		expect((await loadGyms(db)).gyms).toEqual([]); // not synced yet: the server may have gyms
		await db.put('meta', { cursors: {}, lastSyncAt: 1, schema: 1 }, 'sync');
		await Promise.all([ensureDefaultGym(db, USER), ensureDefaultGym(db, USER)]); // overlapping runs
		await ensureDefaultGym(db, USER);
		const { gyms } = await loadGyms(db);
		expect(gyms.map((g) => [g.name, g.kind, g.is_default, g.assume_full])).toEqual([
			['Home', 'home', true, false]
		]);
	});

	it('the first gym is the default; commercial gyms start as full equipment', async () => {
		const db = await fresh();
		const home = await addGym(db, USER, { name: ' Home ', kind: 'home' });
		const big = await addGym(db, USER, { name: 'Virgin Active', kind: 'commercial' });
		expect(home.name).toBe('Home');
		expect([home.is_default, big.is_default]).toEqual([true, false]);
		expect(big.assume_full).toBe(true);
		const { gyms } = await loadGyms(db);
		await makeDefault(db, gyms, big.id);
		expect((await loadGyms(db)).gyms.map((g) => g.name)).toEqual(['Virgin Active', 'Home']);
	});

	it('ticks catalogue items with their catalogue capabilities and starting weights', async () => {
		const db = await fresh();
		const gym = await addGym(db, USER, { name: 'Home', kind: 'home' });
		await setCatalogItem(db, USER, gym.id, catalogItem('kettlebells')!, true);
		await setCatalogItem(db, USER, gym.id, catalogItem('power-rack')!, true);
		const { items } = await loadGyms(db);
		expect(items.find((i) => i.catalog_id === 'kettlebells')?.weights).toEqual([12, 16, 24]);
		expect([...capabilities(gym, items)].sort()).toEqual(['kettlebell', 'pull-up-bar', 'rack']);
	});

	it('unticking then ticking again brings the same row back with its weights', async () => {
		const db = await fresh();
		const gym = await addGym(db, USER, { name: 'Home', kind: 'home' });
		const kb = catalogItem('kettlebells')!;
		await setCatalogItem(db, USER, gym.id, kb, true);
		const [row] = (await loadGyms(db)).items;
		await setWeights(db, row.id, [8, 12]);
		await setCatalogItem(db, USER, gym.id, kb, false);
		expect((await loadGyms(db)).items).toEqual([]);
		await setCatalogItem(db, USER, gym.id, kb, true);
		const { items } = await loadGyms(db);
		expect(items.map((i) => [i.id, i.weights])).toEqual([[row.id, [8, 12]]]);
	});

	it('copies of one item from two offline devices untick together and never double up', async () => {
		const db = await fresh();
		const gym = await addGym(db, USER, { name: 'Home', kind: 'home' });
		const kb = catalogItem('kettlebells')!;
		const row = (id: string, deleted: boolean) => ({
			id,
			user_id: USER,
			gym_profile_id: gym.id,
			catalog_id: kb.id,
			custom_name: null,
			capabilities: kb.capabilities,
			weights: null,
			up: 0,
			deleted
		});
		await put(db, 'gym_equipment', row('00000000-0000-0000-0000-0000000000a1', true));
		await put(db, 'gym_equipment', row('00000000-0000-0000-0000-0000000000a2', false));
		await put(db, 'gym_equipment', row('00000000-0000-0000-0000-0000000000a3', false));
		await setCatalogItem(db, USER, gym.id, kb, true); // already ticked: nothing to revive
		expect((await loadGyms(db)).items).toHaveLength(2);
		await setCatalogItem(db, USER, gym.id, kb, false);
		expect((await loadGyms(db)).items).toEqual([]);
		await setCatalogItem(db, USER, gym.id, kb, true);
		expect((await loadGyms(db)).items).toHaveLength(1);
	});

	it('custom kit keeps its name and capabilities, and edits patch only those fields', async () => {
		const db = await fresh();
		const gym = await addGym(db, USER, { name: 'Park', kind: 'park' });
		const c = await saveCustom(db, USER, gym.id, {
			name: ' Sandbag ',
			capabilities: ['kettlebell']
		});
		await saveCustom(db, USER, gym.id, {
			id: c.id,
			name: 'Sandbag 20 kg',
			capabilities: ['kettlebell', 'med-ball']
		});
		const row = await get(db, 'gym_equipment', c.id);
		expect([row?.custom_name, row?.capabilities, row?.gym_profile_id]).toEqual([
			'Sandbag 20 kg',
			['kettlebell', 'med-ball'],
			gym.id
		]);
	});

	it('deleting a gym soft-deletes its equipment and passes on the default', async () => {
		const db = await fresh();
		const home = await addGym(db, USER, { name: 'Home', kind: 'home' });
		const park = await addGym(db, USER, { name: 'Park', kind: 'park' });
		await setCatalogItem(db, USER, home.id, catalogItem('bench-flat')!, true);
		await setCatalogItem(db, USER, park.id, catalogItem('pull-up-bar')!, true);
		const { gyms, items } = await loadGyms(db);
		await deleteGym(db, gyms, items, home);
		const after = await loadGyms(db);
		expect(after.gyms.map((g) => [g.name, g.is_default])).toEqual([['Park', true]]);
		expect(after.items.map((i) => i.catalog_id)).toEqual(['pull-up-bar']);
		const tomb = (await db.getAll('gym_equipment')).find((i) => i.catalog_id === 'bench-flat');
		expect(tomb?.deleted).toBe(true); // a tombstone that syncs, never a hard delete
		expect(await db.count('outbox')).toBeGreaterThan(0);
	});

	it('a rename does not undo an edit made elsewhere (patch, not a stale copy)', async () => {
		const db = await fresh();
		const gym = await addGym(db, USER, { name: 'Home', kind: 'home' });
		await put(db, 'gym_profiles', { ...gym, assume_full: true }); // e.g. pulled from another device
		await updateGym(db, gym.id, { name: 'Garage' });
		const row = await get(db, 'gym_profiles', gym.id);
		expect([row?.name, row?.assume_full]).toEqual(['Garage', true]);
	});
});
