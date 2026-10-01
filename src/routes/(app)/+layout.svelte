<script lang="ts">
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';
	import { startLocal } from '$lib/data/local.svelte';
	import BrandLogo from '$lib/ui/BrandLogo.svelte';
	import Tabs, { type NavItem } from '$lib/ui/Tabs.svelte';

	let { children } = $props();

	// Member/client tabs (DESIGN-SYSTEM §4).
	const items: NavItem[] = [
		{ href: resolve('/today'), label: 'Today', icon: 'today' },
		{ href: resolve('/train'), label: 'Train', icon: 'train' },
		{ href: resolve('/nutrition'), label: 'Nutrition', icon: 'nutrition' },
		{ href: resolve('/progress'), label: 'Progress', icon: 'progress' },
		{ href: resolve('/coach'), label: 'Coach', icon: 'coach' }
	];

	// Signed out elsewhere (another tab, expired session): leave the app area.
	// Signed in: open this member's device data and start syncing (offline-first, ARCHITECTURE §5).
	$effect(() => {
		const userId = auth.session?.user.id;
		if (!userId) goto(resolve('/sign-in'), { replaceState: true });
		// untrack: this effect depends on the session only, not on the local state startLocal reads.
		else untrack(() => startLocal(userId));
	});
</script>

<Tabs {items} label="Main">
	{#snippet header()}<BrandLogo />{/snippet}
	{#snippet footer()}
		<a
			href={resolve('/settings')}
			class="flex min-h-11 items-center rounded-control px-3 font-semibold text-ink-2 no-underline hover:text-ink"
			>Settings</a
		>
	{/snippet}
</Tabs>

<main
	id="main"
	class="mx-auto min-h-dvh max-w-3xl px-5 pt-6 pb-28 lg:ml-60 lg:px-10 lg:pt-10 lg:pb-10 xl:mx-auto"
>
	{@render children()}
</main>
