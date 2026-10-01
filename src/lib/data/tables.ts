import type { Database } from '$lib/supabase/types';

// Synced tables (ARCHITECTURE §5) in push order: parents before children.
// Grows with each phase; must match private.synced_tables on the server (upsert_lww's allow-list).
export const SYNCED_TABLES = [
	'profiles',
	'gym_profiles',
	'gym_equipment',
	'foods',
	'food_logs',
	'water_logs',
	'body_metrics',
	'photos',
	'targets'
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];
export type Row<T extends SyncedTable> = Database['public']['Tables'][T]['Row'];
/** A row as written on the device: the server sets synced_at. */
export type LocalRow<T extends SyncedTable> = Omit<Row<T>, 'synced_at'> & {
	synced_at?: string | null;
};

/** Local indexes for screen queries (IndexedDB index name = column). */
export const INDEXES: Partial<Record<SyncedTable, string[]>> = {
	gym_equipment: ['gym_profile_id'],
	food_logs: ['eaten_at'],
	water_logs: ['at'],
	body_metrics: ['date'],
	photos: ['taken_on'],
	targets: ['effective_from']
};

/** timestamptz columns, normalised to ISO-8601 UTC ('…Z') locally so string ranges sort correctly. */
export const TIMESTAMPS: Partial<Record<SyncedTable, string[]>> = {
	profiles: ['created_at'],
	food_logs: ['eaten_at'],
	water_logs: ['at']
};

export function normalise<T extends SyncedTable>(table: T, row: LocalRow<T>): LocalRow<T> {
	const cols = TIMESTAMPS[table];
	if (!cols) return row;
	const out = { ...row } as Record<string, unknown>;
	for (const c of cols) {
		const v = out[c];
		if (typeof v === 'string') out[c] = new Date(v).toISOString();
	}
	return out as LocalRow<T>;
}
