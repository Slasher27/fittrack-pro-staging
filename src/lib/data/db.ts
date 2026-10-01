import { deleteDB, openDB, type IDBPDatabase } from 'idb';
import { INDEXES, SYNCED_TABLES } from './tables';

// One IndexedDB per user (D-036): a store per synced table (same shape as the server),
// plus the outbox (unsent changes), meta (sync cursors) and blobs (photo images, never synced).
export const DB_VERSION = 1;
export const dbName = (userId: string) => `fittrack-pro-${userId}`;

export type OutboxEntry = { key: string; table: string; id: string; up: number };
export type LocalDb = IDBPDatabase;

export async function openLocalDb(userId: string): Promise<LocalDb> {
	return openDB(dbName(userId), DB_VERSION, {
		upgrade(db) {
			for (const table of SYNCED_TABLES) {
				if (db.objectStoreNames.contains(table)) continue;
				const store = db.createObjectStore(table, { keyPath: 'id' });
				for (const col of INDEXES[table] ?? []) store.createIndex(col, col);
			}
			if (!db.objectStoreNames.contains('outbox'))
				db.createObjectStore('outbox', { keyPath: 'key' });
			if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
			if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
		}
	});
}

/** Remove this user's data from the device (sign-out with nothing pending). Never writes tombstones.
 * Close any open handle first. */
export async function deleteLocalDb(userId: string) {
	await deleteDB(dbName(userId));
}

export const outboxKey = (table: string, id: string) => `${table}:${id}`;
