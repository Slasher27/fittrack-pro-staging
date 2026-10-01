import 'fake-indexeddb/auto';
import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { openLocalDb } from '$lib/data/db';
import { del, get, list, pendingCount, put } from '$lib/data/repo';
import { syncOnce } from '$lib/data/sync';
import type { LocalRow } from '$lib/data/tables';
import { supabaseTransport, type Transport } from '$lib/data/transport';

// The real sync engine against local Supabase (upsert_lww, RLS, PostgREST filters and paging).
// Runs when PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY are set (.env locally, CI's db job).
const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_ANON_KEY;

describe.skipIf(!url || !key)('sync against local Supabase', () => {
	// Created in beforeAll: a skipped describe still runs its body, and CI's static job has no backend.
	let t: Transport;
	let userId = '';
	let n = 0;
	const device = () => openLocalDb(`it-${userId}-${++n}`);
	const water = (ml: number, id = crypto.randomUUID()): LocalRow<'water_logs'> => ({
		id,
		user_id: userId,
		at: new Date().toISOString(),
		ml,
		up: 0,
		deleted: false
	});

	beforeAll(async () => {
		const sb = createClient(url!, key!, { auth: { persistSession: false } });
		t = supabaseTransport(sb);
		const { data, error } = await sb.auth.signUp({
			email: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
			password: 'correct horse battery',
			options: {
				data: { display_name: 'Sync', birth_year: 1990, adult: true, consent_version: '2026-10-01' }
			}
		});
		if (error) throw error;
		userId = data.user!.id;
	});

	it('first sync pulls the profile created at sign-up', async () => {
		const db = await device();
		const res = await syncOnce(db, t);
		expect(res.full).toBe(true);
		expect((await get(db, 'profiles', userId))?.display_name).toBe('Sync');
	});

	it('two devices converge, deletes propagate, and the outbox empties', async () => {
		const a = await device();
		const b = await device();
		await syncOnce(a, t);
		await syncOnce(b, t);

		const row = await put(a, 'water_logs', water(250));
		await syncOnce(a, t);
		await syncOnce(b, t);
		expect((await get(b, 'water_logs', row.id))?.ml).toBe(250);

		await put(a, 'water_logs', { ...row, ml: 500 }, Date.now() + 1000);
		await put(b, 'water_logs', { ...row, ml: 750 }, Date.now() + 2000);
		await syncOnce(a, t);
		await syncOnce(b, t);
		await syncOnce(a, t);
		expect((await get(a, 'water_logs', row.id))?.ml).toBe(750);
		expect((await get(b, 'water_logs', row.id))?.ml).toBe(750);

		await del(b, 'water_logs', row.id, Date.now() + 3000);
		await syncOnce(b, t);
		await syncOnce(a, t);
		expect(await get(a, 'water_logs', row.id)).toBeUndefined();
		expect(await pendingCount(a)).toBe(0);
		expect(await pendingCount(b)).toBe(0);
	});

	it('rejects a row that fails a check without blocking the others', async () => {
		const db = await device();
		await syncOnce(db, t);
		const bad = await put(db, 'water_logs', water(-5));
		const good = await put(db, 'water_logs', water(300));
		const res = await syncOnce(db, t);
		expect(res.rejected).toBe(1);
		expect(await get(db, 'water_logs', bad.id)).toBeUndefined();
		expect((await get(db, 'water_logs', good.id))?.ml).toBe(300);
	});

	it('pages with the keyset filter (small pages)', async () => {
		const a = await device();
		await syncOnce(a, t);
		for (let i = 0; i < 7; i++) await put(a, 'water_logs', water(100 + i));
		await syncOnce(a, t);
		const b = await device();
		await syncOnce(b, t, Date.now(), 3); // full pull in pages of 3
		const pulledB = (await list(b, 'water_logs')).length;
		expect(pulledB).toBe((await list(a, 'water_logs')).length);
		await put(a, 'water_logs', water(999));
		await syncOnce(a, t);
		await syncOnce(b, t, Date.now(), 3); // incremental pull, also paged
		expect((await list(b, 'water_logs')).length).toBe(pulledB + 1);
	});
});
