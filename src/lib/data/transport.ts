import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncedTable } from './tables';

// What the sync engine needs from the server. Supabase in the app; an in-memory fake in tests.
export type ServerRow = Record<string, unknown> & { id: string; up: number; synced_at: string };
export type UpsertResult = {
	applied: string[];
	stale: string[];
	rejected: { id: string; error: string }[];
};

export interface Transport {
	/** upsert_lww: last-write-wins per row (ARCHITECTURE §5). */
	upsert(table: SyncedTable, rows: Record<string, unknown>[]): Promise<UpsertResult>;
	/** Rows with synced_at > since (or all when null), ordered by (synced_at, id), after a keyset position. */
	pullSince(
		table: SyncedTable,
		since: string | null,
		after: { synced_at: string; id: string } | null,
		limit: number
	): Promise<ServerRow[]>;
	fetchByIds(table: SyncedTable, ids: string[]): Promise<ServerRow[]>;
}

export function supabaseTransport(sb: SupabaseClient): Transport {
	const fail = (what: string, e: { message: string }) => {
		throw new Error(`${what}: ${e.message}`);
	};
	return {
		async upsert(table, rows) {
			const { data, error } = await sb.rpc('upsert_lww', { tbl: table, rows });
			if (error) fail('push', error);
			return data as UpsertResult;
		},
		async pullSince(table, since, after, limit) {
			let q = sb.from(table).select('*');
			if (after)
				q = q.or(
					`synced_at.gt."${after.synced_at}",and(synced_at.eq."${after.synced_at}",id.gt.${after.id})`
				);
			else if (since) q = q.gt('synced_at', since);
			const { data, error } = await q.order('synced_at').order('id').limit(limit);
			if (error) fail('pull', error);
			return (data ?? []) as ServerRow[];
		},
		async fetchByIds(table, ids) {
			if (!ids.length) return [];
			const { data, error } = await sb.from(table).select('*').in('id', ids);
			if (error) fail('refetch', error);
			return (data ?? []) as ServerRow[];
		}
	};
}
