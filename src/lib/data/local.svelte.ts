import { supabase } from '$lib/supabase/client';
import { toast } from '$lib/ui/toast.svelte';
import { deleteLocalDb, openLocalDb, type LocalDb } from './db';
import { changes, pendingCount } from './repo';
import { syncOnce } from './sync';
import { supabaseTransport } from './transport';

// The signed-in member's device data: their IndexedDB plus the sync loop and its status.
type Status = 'idle' | 'syncing' | 'offline' | 'error';

export const local = $state<{
	db: LocalDb | null;
	userId: string | null;
	status: Status;
	lastSyncAt: number | null;
	pending: number;
	/** Bumps on every local write and every sync that pulled changes: screens re-read when it changes. */
	version: number;
}>({ db: null, userId: null, status: 'idle', lastSyncAt: null, pending: 0, version: 0 });

const DEBOUNCE_MS = 2000;
const REFRESH_MS = 5 * 60_000;
let timer: ReturnType<typeof setTimeout> | undefined;
let interval: ReturnType<typeof setInterval> | undefined;
let running: Promise<void> | null = null;
let again = false;

/** Run one sync round now (coalesces concurrent calls). Resolves when done; never throws. */
export function syncNow(): Promise<void> {
	if (running) {
		again = true;
		return running;
	}
	running = (async () => {
		do {
			again = false;
			await round();
		} while (again);
	})().finally(() => (running = null));
	return running;
}

async function round() {
	const db = local.db;
	if (!db || !supabase) return;
	if (!navigator.onLine) {
		local.status = 'offline';
		local.pending = await pendingCount(db);
		return;
	}
	local.status = 'syncing';
	try {
		const res = await syncOnce(db, supabaseTransport(supabase));
		local.status = 'idle';
		local.lastSyncAt = Date.now();
		if (res.pulled) local.version++;
		if (res.rejected)
			toast(
				res.rejected === 1
					? 'One change couldn’t be saved, so it was undone.'
					: `${res.rejected} changes couldn’t be saved, so they were undone.`,
				'warn'
			);
	} catch {
		local.status = navigator.onLine ? 'error' : 'offline'; // kept in the outbox; retried next time
	}
	if (local.db === db) local.pending = await pendingCount(db);
}

function soon() {
	local.version++;
	clearTimeout(timer);
	timer = setTimeout(syncNow, DEBOUNCE_MS);
	if (local.db) pendingCount(local.db).then((n) => (local.pending = n));
}

const onVisibility = () => syncNow(); // hidden: flush before the phone freezes us; visible: pull
const onOnline = () => syncNow();
const onOffline = () => (local.status = 'offline');

let starting: { userId: string; done: Promise<void> } | null = null;

/** Open the member's local database and start syncing. Safe to call again for the same user. */
export function startLocal(userId: string): Promise<void> {
	if (starting?.userId === userId) return starting.done;
	if (local.userId === userId) return Promise.resolve();
	const done = start(userId).finally(() => {
		if (starting?.done === done) starting = null;
	});
	starting = { userId, done };
	return done;
}

async function start(userId: string) {
	await stopLocal();
	local.userId = userId;
	local.db = await openLocalDb(userId);
	changes.addEventListener('change', soon);
	document.addEventListener('visibilitychange', onVisibility);
	window.addEventListener('pagehide', onVisibility);
	window.addEventListener('online', onOnline);
	window.addEventListener('offline', onOffline);
	interval = setInterval(() => !document.hidden && syncNow(), REFRESH_MS);
	await syncNow();
}

export async function stopLocal() {
	clearTimeout(timer);
	clearInterval(interval);
	changes.removeEventListener('change', soon);
	document.removeEventListener('visibilitychange', onVisibility);
	window.removeEventListener('pagehide', onVisibility);
	window.removeEventListener('online', onOnline);
	window.removeEventListener('offline', onOffline);
	await running;
	local.db?.close();
	Object.assign(local, { db: null, userId: null, status: 'idle', lastSyncAt: null, pending: 0 });
	local.version++;
}

/** Sign-out (D-036): remove this member's data from the device. Only call with nothing pending. */
export async function forgetLocal() {
	const { userId } = local;
	await stopLocal(); // closes the handle
	if (userId) await deleteLocalDb(userId);
}
