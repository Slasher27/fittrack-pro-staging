/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
// App-shell cache (ROADMAP Phase 0). Data offline is IndexedDB's job (Phase 1), never this cache.
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `shell-${version}`;
const SHELL = '/'; // Any route returns the same SPA shell (200.html fallback).
const ASSETS = new Set([...build, ...files]);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll([...ASSETS, SHELL]))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== sw.location.origin) return; // Supabase and other APIs go straight to the network.

	// Hashed build files and static files: cache first, they never change within a version.
	if (ASSETS.has(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((hit) => hit ?? fetch(req)));
		return;
	}

	// Page loads: network first so deploys show up; the cached shell when offline.
	if (req.mode === 'navigate') {
		event.respondWith(
			fetch(req).catch(async () => (await caches.match(SHELL)) ?? Response.error())
		);
	}
});
