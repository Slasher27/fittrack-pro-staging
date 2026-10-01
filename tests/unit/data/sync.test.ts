import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { openLocalDb, type LocalDb } from '$lib/data/db';
import { del, get, list, pendingCount, put } from '$lib/data/repo';
import { PAGE, PURGE_HORIZON_MS, syncOnce } from '$lib/data/sync';
import type { LocalRow } from '$lib/data/tables';
import { FakeServer } from './fake-server';

const USER = 'aaaaaaaa-0000-0000-0000-000000000001';
const T0 = Date.parse('2026-10-01T08:00:00Z');
let n = 0;
let server: FakeServer;

/** A device: its own IndexedDB (unique name per test run) talking to the shared fake server. */
async function device() {
	return openLocalDb(`${USER}-${++n}`);
}

function water(id: string, ml: number): LocalRow<'water_logs'> {
	return { id, user_id: USER, at: '2026-10-01T09:00:00.000Z', ml, up: 0, deleted: false };
}

const sync = (db: LocalDb, now = T0) => syncOnce(db, server.transport(), now);

beforeEach(() => {
	server = new FakeServer();
});

describe('repositories', () => {
	it('stamp up, queue an outbox entry and soft-delete', async () => {
		const db = await device();
		const row = await put(db, 'water_logs', water('w1', 250), T0);
		expect(row.up).toBe(T0);
		expect(await pendingCount(db)).toBe(1);

		await del(db, 'water_logs', 'w1', T0 + 5);
		expect(await get(db, 'water_logs', 'w1')).toBeUndefined();
		expect(await list(db, 'water_logs')).toEqual([]);
		expect(((await db.get('water_logs', 'w1')) as LocalRow<'water_logs'>).deleted).toBe(true);
		expect(await pendingCount(db)).toBe(1); // one entry per row, not per write
	});

	it('never stamps backwards when the device clock goes back', async () => {
		const db = await device();
		await put(db, 'water_logs', water('w1', 250), T0);
		const again = await put(db, 'water_logs', water('w1', 300), T0 - 60_000);
		expect(again.up).toBe(T0 + 1);
	});

	it('normalises timestamps so day ranges sort as strings', async () => {
		const db = await device();
		const row = await put(
			db,
			'water_logs',
			{ ...water('w1', 250), at: '2026-10-01T11:00:00+02:00' },
			T0
		);
		expect(row.at).toBe('2026-10-01T09:00:00.000Z');
	});
});

describe('sync', () => {
	it('pushes the outbox and pulls server rows on the first run', async () => {
		server.serverWrite('targets', {
			id: 't1',
			user_id: USER,
			effective_from: '2026-10-01',
			kcal: 2100,
			deleted: false
		});
		const db = await device();
		await put(db, 'water_logs', water('w1', 250), T0);

		const res = await sync(db);
		expect(res).toMatchObject({ full: true, pushed: 1, rejected: 0 });
		expect(await pendingCount(db)).toBe(0);
		expect(server.rows('water_logs').map((r) => r.ml)).toEqual([250]);
		expect((await get(db, 'targets', 't1'))?.kcal).toBe(2100);
	});

	it('two devices converge after conflicting offline edits (last write wins)', async () => {
		const a = await device();
		const b = await device();
		await put(a, 'water_logs', water('w1', 250), T0);
		await sync(a);
		await sync(b);

		// Both edit offline; B's edit is later. A syncs first, then B.
		await put(a, 'water_logs', water('w1', 500), T0 + 1000);
		await put(b, 'water_logs', water('w1', 750), T0 + 2000);
		await sync(a);
		await sync(b);
		await sync(a);
		expect((await get(a, 'water_logs', 'w1'))?.ml).toBe(750);
		expect((await get(b, 'water_logs', 'w1'))?.ml).toBe(750);

		// Same again with the order reversed: the later edit still wins.
		await put(b, 'water_logs', water('w1', 100), T0 + 3000);
		await put(a, 'water_logs', water('w1', 200), T0 + 4000);
		await sync(b);
		await sync(a);
		await sync(b);
		expect((await get(a, 'water_logs', 'w1'))?.ml).toBe(200);
		expect((await get(b, 'water_logs', 'w1'))?.ml).toBe(200);
		expect(await pendingCount(a)).toBe(0);
		expect(await pendingCount(b)).toBe(0);
	});

	it('a deletion on one device disappears on the other', async () => {
		const a = await device();
		const b = await device();
		await put(a, 'water_logs', water('w1', 250), T0);
		await sync(a);
		await sync(b);
		expect(await list(b, 'water_logs')).toHaveLength(1);

		await del(a, 'water_logs', 'w1', T0 + 1000);
		await sync(a);
		await sync(b);
		expect(await list(b, 'water_logs')).toEqual([]);
		expect(server.rows('water_logs')[0].deleted).toBe(true); // soft: the server keeps the tombstone
	});

	it('picks up late offline pushes stamped long ago (server cursor, not device time)', async () => {
		const a = await device();
		const b = await device();
		await sync(a);
		await sync(b);
		// B logged water days ago while offline; it reaches the server only now.
		await put(b, 'water_logs', water('w-old', 300), T0 - 3 * 24 * 3600_000);
		await sync(b);
		await sync(a);
		expect((await get(a, 'water_logs', 'w-old'))?.ml).toBe(300);
	});

	it('keeps a newer pending local edit when an older server version is pulled', async () => {
		const a = await device();
		const b = await device();
		await put(a, 'water_logs', water('w1', 250), T0);
		await sync(a);
		await sync(b);
		await put(a, 'water_logs', water('w1', 400), T0 + 1000); // server gets this
		await sync(a);
		await put(b, 'water_logs', water('w1', 900), T0 + 2000); // newer, still pending on B
		await sync(b);
		expect((await get(b, 'water_logs', 'w1'))?.ml).toBe(900);
		expect(server.rows('water_logs')[0].ml).toBe(900);
	});

	it('keeps an edit made while a pull is in progress (pending beats an older server row)', async () => {
		const a = await device();
		const b = await device();
		await put(a, 'water_logs', water('w1', 250), T0);
		await sync(a);
		await sync(b);
		await put(a, 'water_logs', water('w1', 400), T0 + 1000);
		await sync(a);

		const t = server.transport();
		const pullSince = t.pullSince;
		let edited = false;
		t.pullSince = async (...args) => {
			const rows = await pullSince(...args);
			if (args[0] === 'water_logs' && !edited) {
				edited = true;
				await put(b, 'water_logs', water('w1', 900), T0 + 2000); // logged mid-pull
			}
			return rows;
		};
		await syncOnce(b, t, T0 + 2000);
		expect((await get(b, 'water_logs', 'w1'))?.ml).toBe(900);
		expect(await pendingCount(b)).toBe(1);
		await sync(b);
		expect(server.rows('water_logs')[0].ml).toBe(900);
	});

	it('a full pull (e.g. after a local schema upgrade) keeps unsynced edits', async () => {
		const db = await device();
		await put(db, 'water_logs', water('w1', 250), T0);
		await put(db, 'water_logs', water('w2', 100), T0);
		await sync(db);
		await put(db, 'water_logs', water('w1', 900), T0 + 1000); // edited offline
		await put(db, 'water_logs', water('w3', 50), T0 + 1000); // created offline
		await db.put('meta', { ...(await db.get('meta', 'sync')), schema: 0 }, 'sync'); // pretend an upgrade

		const res = await sync(db, T0 + 2000);
		expect(res.full).toBe(true);
		expect((await list(db, 'water_logs')).map((r) => [r.id, r.ml])).toEqual([
			['w1', 900],
			['w2', 100],
			['w3', 50]
		]);
		expect(server.rows('water_logs').find((r) => r.id === 'w1')?.ml).toBe(900);
	});

	it('takes the server version when a push is stale, even if the cursor has passed it', async () => {
		const db = await device();
		await put(db, 'water_logs', water('w1', 250), T0);
		await sync(db);
		server.serverWrite('water_logs', { id: 'w1', ml: 1000 }); // e.g. an RPC: server-stamped up
		await put(db, 'water_logs', water('w1', 50), T0 + 1); // older than the server's up
		await sync(db, T0 + 10);
		expect((await get(db, 'water_logs', 'w1'))?.ml).toBe(1000);
		expect(await pendingCount(db)).toBe(0);
	});

	it('drops a rejected row without blocking the rest of the outbox', async () => {
		server.reject = (_t, r) => ((r.ml as number) < 0 ? '23514' : null);
		const db = await device();
		await put(db, 'water_logs', water('bad', -5), T0);
		await put(db, 'water_logs', water('good', 250), T0);
		const res = await sync(db);
		expect(res.rejected).toBe(1);
		expect(await pendingCount(db)).toBe(0);
		expect(await get(db, 'water_logs', 'bad')).toBeUndefined(); // re-pulled: the server has no such row
		expect(server.rows('water_logs').map((r) => r.id)).toEqual(['good']);
	});

	it('keeps the outbox when offline and pushes once back online', async () => {
		const db = await device();
		await sync(db);
		await put(db, 'water_logs', water('w1', 250), T0);
		server.online = false;
		await expect(sync(db)).rejects.toThrow();
		expect(await pendingCount(db)).toBe(1);
		server.online = true;
		await sync(db);
		expect(await pendingCount(db)).toBe(0);
		expect(server.rows('water_logs')).toHaveLength(1);
	});

	it('keeps an edit made while its push was in flight', async () => {
		const db = await device();
		await sync(db);
		await put(db, 'water_logs', water('w1', 250), T0);
		const t = server.transport();
		const upsert = t.upsert;
		t.upsert = async (table, rows) => {
			await put(db, 'water_logs', water('w1', 300), T0 + 1); // user edits during the request
			return upsert(table, rows);
		};
		await syncOnce(db, t, T0);
		expect(await pendingCount(db)).toBe(1);
		await sync(db);
		expect(server.rows('water_logs')[0].ml).toBe(300);
	});

	it('past the purge horizon, does a full pull and never resurrects purged rows', async () => {
		const db = await device();
		await put(db, 'water_logs', water('purged', 250), T0);
		await sync(db);

		// Another device deletes it; the device stays away for > 90 days; the server purges the tombstone.
		server.serverWrite('water_logs', { id: 'purged', deleted: true });
		const later = T0 + PURGE_HORIZON_MS + 24 * 3600_000;
		server.purge(later);
		// Meanwhile, offline, this device edited the old row (stale) and logged a new one.
		await put(db, 'water_logs', water('purged', 999), T0 + 1000);
		await put(db, 'water_logs', water('new', 300), later);

		const res = await sync(db, later);
		expect(res.full).toBe(true);
		expect(await get(db, 'water_logs', 'purged')).toBeUndefined();
		expect(server.rows('water_logs').map((r) => r.id)).toEqual(['new']);
	});

	it(`pages through more than ${PAGE} rows`, async () => {
		for (let i = 0; i < PAGE + 205; i++)
			server.serverWrite('water_logs', {
				id: `w${String(i).padStart(5, '0')}`,
				user_id: USER,
				ml: 100,
				deleted: false
			});
		const db = await device();
		await sync(db);
		expect(await list(db, 'water_logs')).toHaveLength(PAGE + 205);
	});
});
