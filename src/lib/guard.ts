import { redirect } from '@sveltejs/kit';
import { auth, authReady } from '$lib/auth.svelte';

/** Layout load for signed-in areas: send signed-out visitors to sign-in, then back. */
export async function requireSession(url: URL) {
	await authReady;
	if (!auth.session)
		redirect(307, `/sign-in?next=${encodeURIComponent(url.pathname + url.search)}`);
}
