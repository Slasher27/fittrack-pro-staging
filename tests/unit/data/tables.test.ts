import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SYNCED_TABLES } from '$lib/data/tables';

describe('SYNCED_TABLES', () => {
	it('matches the tables the migrations allow-list for upsert_lww', () => {
		const dir = 'supabase/migrations';
		const sql = readdirSync(dir)
			.map((f) => readFileSync(`${dir}/${f}`, 'utf8'))
			.join('\n');
		const server = [...sql.matchAll(/private\.enable_sync\('public\.([a-z_]+)'\)/g)].map(
			(m) => m[1]
		);
		expect([...server].sort()).toEqual([...SYNCED_TABLES].sort());
	});
});
