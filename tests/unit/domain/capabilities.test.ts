import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAPABILITIES, isCapability } from '$lib/domain/capabilities';

describe('capabilities', () => {
	it('matches the SQL vocabulary in private.valid_capabilities()', () => {
		const sql = readFileSync('supabase/migrations/0004_equipment.sql', 'utf8');
		const list = /caps <@ array\[([\s\S]*?)\]::text\[\]/.exec(sql)![1];
		const tokens = [...list.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
		expect([...tokens].sort()).toEqual([...CAPABILITIES].sort());
	});

	it('recognises tokens and rejects v3 "none" and free text', () => {
		expect(isCapability('pull-up-bar')).toBe(true);
		expect(isCapability('none')).toBe(false);
		expect(isCapability('cable')).toBe(false);
	});
});
