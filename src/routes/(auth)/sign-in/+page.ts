import { redirect } from '@sveltejs/kit';
import { auth, authReady } from '$lib/auth.svelte';
import { safeNext } from '$lib/nav';

export const load = async ({ url }) => {
	await authReady;
	if (auth.session) redirect(307, safeNext(url.searchParams.get('next')));
};
