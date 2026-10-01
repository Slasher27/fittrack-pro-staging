import { DB_VERSION, outboxKey, type LocalDb, type OutboxEntry } from './db';
import { normalise, SYNCED_TABLES, type LocalRow, type SyncedTable } from './tables';
import type { ServerRow, Transport } from './transport';

// Sync engine (ARCHITECTURE §5): push the outbox through upsert_lww, then pull what changed by the
// server's synced_at cursor. Last-write-wins on `up`; deletes are soft and sync like edits.

export const BATCH = 500; // upsert_lww limit
export const PAGE = 1000;
export const OVERLAP_MS = 10_000; // pull overlap: covers transactions that commit after their stamp
export const PURGE_HORIZON_MS = 90 * 24 * 3600_000; // server purges tombstones older than this

export type SyncResult = { pushed: number; pulled: number; rejected: number; full: boolean };

type Meta = { cursors: Partial<Record<SyncedTable, string>>; lastSyncAt: number; schema: number };

async function readMeta(db: LocalDb): Promise<Meta | undefined> {
	return db.get('meta', 'sync');
}

/** Apply one server row with LWW. A newer pending local edit wins (it will be pushed). */
async function applyRemote(db: LocalDb, table: SyncedTable, row: ServerRow, authoritative = false) {
	const tx = db.transaction([table, 'outbox'], 'readwrite');
	const key = outboxKey(table, row.id);
	const [local, pending] = (await Promise.all([
		tx.objectStore(table).get(row.id),
		tx.objectStore('outbox').get(key)
	])) as [LocalRow<SyncedTable> | undefined, OutboxEntry | undefined];
	let applied = false;
	if (pending && pending.up > row.up) {
		// Keep the local edit.
	} else if (authoritative || !local || row.up >= local.up) {
		await tx.objectStore(table).put(normalise(table, row as unknown as LocalRow<SyncedTable>));
		if (pending) await tx.objectStore('outbox').delete(key);
		applied = true;
	}
	await tx.done;
	return applied;
}

/** Remove a local row the server doesn't have (or won't show us), unless a newer edit is pending. */
async function dropLocal(db: LocalDb, table: SyncedTable, id: string) {
	const tx = db.transaction([table, 'outbox'], 'readwrite');
	if (!(await tx.objectStore('outbox').get(outboxKey(table, id))))
		await tx.objectStore(table).delete(id);
	await tx.done;
}

/** Clear an outbox entry only if the row wasn't edited again while it was in flight. */
async function settle(db: LocalDb, table: SyncedTable, id: string, sentUp: number) {
	const tx = db.transaction('outbox', 'readwrite');
	const key = outboxKey(table, id);
	const entry = (await tx.store.get(key)) as OutboxEntry | undefined;
	if (entry && entry.up === sentUp) await tx.store.delete(key);
	await tx.done;
}

/** Re-read rows from the server and take its version (after stale or rejected pushes). */
async function refetch(db: LocalDb, t: Transport, table: SyncedTable, ids: string[]) {
	if (!ids.length) return;
	const rows = await t.fetchByIds(table, ids);
	const found = new Set(rows.map((r) => r.id));
	for (const r of rows) await applyRemote(db, table, r, true);
	for (const id of ids) if (!found.has(id)) await dropLocal(db, table, id);
}

export async function push(db: LocalDb, t: Transport) {
	const entries = (await db.getAll('outbox')) as OutboxEntry[];
	let pushed = 0;
	let rejected = 0;
	for (const table of SYNCED_TABLES) {
		const mine = entries.filter((e) => e.table === table);
		for (let i = 0; i < mine.length; i += BATCH) {
			const batch = mine.slice(i, i + BATCH);
			const rows: Record<string, unknown>[] = [];
			const sentUp = new Map<string, number>();
			for (const e of batch) {
				const row = (await db.get(table, e.id)) as Record<string, unknown> | undefined;
				if (!row) {
					await settle(db, table, e.id, e.up);
					continue;
				}
				const { synced_at: _serverOwned, ...rest } = row; // eslint-disable-line @typescript-eslint/no-unused-vars
				rows.push(rest);
				sentUp.set(e.id, row.up as number);
			}
			if (!rows.length) continue;
			const res = await t.upsert(table, rows);
			for (const id of [...res.applied, ...res.stale]) await settle(db, table, id, sentUp.get(id)!);
			for (const { id } of res.rejected) await settle(db, table, id, sentUp.get(id)!);
			pushed += res.applied.length;
			rejected += res.rejected.length;
			await refetch(db, t, table, [...res.stale, ...res.rejected.map((r) => r.id)]);
		}
	}
	return { pushed, rejected };
}

/** Incremental pull per table by the server cursor, with an overlap (idempotent). */
export async function pull(db: LocalDb, t: Transport, meta: Meta, page = PAGE) {
	let pulled = 0;
	for (const table of SYNCED_TABLES) {
		const cursor = meta.cursors[table];
		const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null;
		let after: { synced_at: string; id: string } | null = null;
		for (;;) {
			const rows = await t.pullSince(table, since, after, page);
			for (const r of rows) if (await applyRemote(db, table, r)) pulled++;
			const last = rows.at(-1);
			if (last) {
				after = { synced_at: last.synced_at, id: last.id };
				if (!meta.cursors[table] || Date.parse(last.synced_at) > Date.parse(meta.cursors[table]!))
					meta.cursors[table] = last.synced_at;
			}
			if (rows.length < page) break;
		}
	}
	return pulled;
}

/**
 * Full pull: replace local rows that have no pending edit, delete local rows the server no longer
 * returns, then push. Used on the first run on a device, after a local schema upgrade, when the
 * cursor is older than the purge horizon, and (Phase 4) after a relationship change.
 */
export async function fullPull(
	db: LocalDb,
	t: Transport,
	now: number,
	lastSyncAt?: number,
	page = PAGE
) {
	const meta: Meta = { cursors: {}, lastSyncAt: 0, schema: DB_VERSION };
	const pastHorizon = lastSyncAt !== undefined && now - lastSyncAt > PURGE_HORIZON_MS;
	let pulled = 0;
	for (const table of SYNCED_TABLES) {
		const seen = new Set<string>();
		let after: { synced_at: string; id: string } | null = null;
		for (;;) {
			const rows = await t.pullSince(table, null, after, page);
			for (const r of rows) {
				seen.add(r.id);
				// Server version replaces local rows without a pending edit.
				if (await applyRemote(db, table, r, true)) pulled++;
			}
			const last = rows.at(-1);
			if (last) {
				after = { synced_at: last.synced_at, id: last.id };
				meta.cursors[table] = last.synced_at;
			}
			if (rows.length < page) break;
		}
		for (const id of (await db.getAllKeys(table)) as string[]) {
			if (seen.has(id)) continue;
			const entry = (await db.get('outbox', outboxKey(table, id))) as OutboxEntry | undefined;
			// Past the horizon, an old pending edit to a row the server purged must not resurrect it.
			if (entry && pastHorizon && entry.up < now - PURGE_HORIZON_MS) {
				await db.delete('outbox', entry.key);
			}
			await dropLocal(db, table, id);
		}
	}
	return { meta, pulled };
}

/** One sync round. Throws on network errors; the outbox is kept and retried next time. */
export async function syncOnce(
	db: LocalDb,
	t: Transport,
	now = Date.now(),
	page = PAGE
): Promise<SyncResult> {
	let meta = await readMeta(db);
	let full = false;
	let pulled = 0;
	if (!meta || meta.schema !== DB_VERSION || now - meta.lastSyncAt > PURGE_HORIZON_MS) {
		({ meta, pulled } = await fullPull(db, t, now, meta?.lastSyncAt, page));
		full = true;
	}
	const { pushed, rejected } = await push(db, t);
	pulled += await pull(db, t, meta, page);
	meta.lastSyncAt = now;
	await db.put('meta', meta, 'sync');
	return { pushed, pulled, rejected, full };
}
