import { outboxKey, type LocalDb, type OutboxEntry } from './db';
import { normalise, type LocalRow, type SyncedTable } from './tables';
import { DEFAULT_TIMEZONE } from '$lib/domain/dates';

// Repositories: every member-app write goes through here (CLAUDE.md: never straight to Supabase).
// A write saves the row and its outbox entry in one transaction, so nothing is lost if the app dies.

/** Fired after every local write; the sync engine listens to push soon. */
export const changes = new EventTarget();

/** Stamp a write: never go backwards, even if the device clock does. */
function stamp(prevUp: number | undefined, now: number) {
	return Math.max(now, (prevUp ?? 0) + 1);
}

export async function put<T extends SyncedTable>(
	db: LocalDb,
	table: T,
	row: LocalRow<T>,
	now = Date.now()
): Promise<LocalRow<T>> {
	const tx = db.transaction([table, 'outbox'], 'readwrite');
	const store = tx.objectStore(table);
	const prev = (await store.get(row.id)) as LocalRow<T> | undefined;
	// Rows are plain JSON (photo images live in the blobs store). Copying also strips Svelte $state
	// proxies, which IndexedDB can't store (a recipe's ingredient list hit this).
	const plain = JSON.parse(JSON.stringify(row)) as LocalRow<T>;
	const next = normalise(table, { ...prev, ...plain, up: stamp(prev?.up, now) } as LocalRow<T>);
	const entry: OutboxEntry = { key: outboxKey(table, row.id), table, id: row.id, up: next.up };
	await Promise.all([store.put(next), tx.objectStore('outbox').put(entry), tx.done]);
	changes.dispatchEvent(new CustomEvent('change', { detail: { table } }));
	return next;
}

/** Soft delete (D-015): the tombstone syncs like any other change. */
export async function del<T extends SyncedTable>(
	db: LocalDb,
	table: T,
	id: string,
	now = Date.now()
) {
	const prev = (await db.get(table, id)) as LocalRow<T> | undefined;
	if (!prev || prev.deleted) return;
	await put(db, table, { ...prev, deleted: true }, now);
}

export async function get<T extends SyncedTable>(db: LocalDb, table: T, id: string) {
	const row = (await db.get(table, id)) as LocalRow<T> | undefined;
	return row && !row.deleted ? row : undefined;
}

/** Live rows, optionally by an index range (e.g. one day's food logs). */
export async function list<T extends SyncedTable>(
	db: LocalDb,
	table: T,
	query?: { index: string; range: IDBKeyRange }
): Promise<LocalRow<T>[]> {
	const rows = (
		query ? await db.getAllFromIndex(table, query.index, query.range) : await db.getAll(table)
	) as LocalRow<T>[];
	return rows.filter((r) => !r.deleted);
}

export async function pendingCount(db: LocalDb) {
	return db.count('outbox');
}

/** The member's timezone, which their "day" is measured in (CLAUDE.md: Dates). */
export async function timezoneOf(db: LocalDb, userId: string) {
	return (await get(db, 'profiles', userId))?.timezone || DEFAULT_TIMEZONE;
}
