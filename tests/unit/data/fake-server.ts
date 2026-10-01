import type { SyncedTable } from '$lib/data/tables';
import type { ServerRow, Transport, UpsertResult } from '$lib/data/transport';

// In-memory server with upsert_lww's rules (supabase/migrations/0002_sync.sql): patch semantics,
// LWW on `up`, per-row rejects, server-stamped synced_at. One owner, so RLS is out of scope here
// (pgTAP covers it).
export class FakeServer {
	tables = new Map<string, Map<string, ServerRow>>();
	clock = Date.parse('2026-10-01T08:00:00Z');
	/** Return an SQLSTATE to reject a row, as a check constraint would. */
	reject: (table: string, row: Record<string, unknown>) => string | null = () => null;
	online = true;

	private table(name: string) {
		if (!this.tables.has(name)) this.tables.set(name, new Map());
		return this.tables.get(name)!;
	}
	private stamp() {
		this.clock += 1;
		return new Date(this.clock).toISOString();
	}
	private check() {
		if (!this.online) throw new Error('Failed to fetch');
	}

	/** A write that bypasses upsert_lww (trainer, RPC): the server stamps `up` too. */
	serverWrite(table: string, row: Record<string, unknown> & { id: string }) {
		const t = this.table(table);
		const merged = {
			...t.get(row.id),
			...row,
			up: this.clock + 1,
			synced_at: this.stamp()
		} as ServerRow;
		t.set(row.id, merged);
	}

	/** Nightly purge: hard-delete tombstones stamped before `before`. */
	purge(before: number) {
		for (const t of this.tables.values())
			for (const [id, r] of t) if (r.deleted && Date.parse(r.synced_at) < before) t.delete(id);
	}

	rows(table: string) {
		return [...this.table(table).values()];
	}

	transport(): Transport {
		return {
			upsert: async (table, rows) => {
				this.check();
				const t = this.table(table);
				const res: UpsertResult = { applied: [], stale: [], rejected: [] };
				for (const r of rows) {
					const id = r.id as string;
					const existing = t.get(id);
					const merged = { ...existing, ...r } as ServerRow;
					const err = r.up === undefined ? '23502' : this.reject(table, merged);
					if (err) res.rejected.push({ id, error: err });
					else if (existing && existing.up > merged.up) res.stale.push(id);
					else {
						t.set(id, { ...merged, synced_at: this.stamp() });
						res.applied.push(id);
					}
				}
				return res;
			},
			pullSince: async (table, since, after, limit) => {
				this.check();
				return this.sorted(table)
					.filter((r) =>
						after
							? r.synced_at > after.synced_at ||
								(r.synced_at === after.synced_at && r.id > after.id)
							: !since || r.synced_at > since
					)
					.slice(0, limit)
					.map((r) => ({ ...r }));
			},
			fetchByIds: async (table, ids) => {
				this.check();
				return ids.flatMap((id) => {
					const r = this.table(table).get(id);
					return r ? [{ ...r }] : [];
				});
			}
		};
	}

	private sorted(table: SyncedTable) {
		return this.rows(table).sort((a, b) =>
			a.synced_at === b.synced_at
				? a.id.localeCompare(b.id)
				: a.synced_at.localeCompare(b.synced_at)
		);
	}
}
