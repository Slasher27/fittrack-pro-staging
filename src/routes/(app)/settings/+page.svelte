<script lang="ts">
	import { resolve } from '$app/paths';
	import { auth } from '$lib/auth.svelte';
	import { showDevRoutes } from '$lib/dev';
	import { setTheme, theme, type ThemePref } from '$lib/theme/theme.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import SegmentedControl from '$lib/ui/SegmentedControl.svelte';
	import SignOut from './SignOut.svelte';
	import SyncCard from './SyncCard.svelte';

	let pref = $state<ThemePref>(theme.pref);
	$effect(() => setTheme(pref));
</script>

<svelte:head><title>Settings · FitTrack Pro</title></svelte:head>

<h1 class="mt-0 mb-6 text-display">Settings</h1>

<div class="flex flex-col gap-4">
	<Card as="section" aria-labelledby="appearance">
		<h2 id="appearance" class="mt-0 mb-4 text-title">Appearance</h2>
		<SegmentedControl
			legend="Theme"
			bind:value={pref}
			options={[
				{ value: 'auto', label: 'Auto' },
				{ value: 'light', label: 'Light' },
				{ value: 'dark', label: 'Dark' }
			]}
		/>
	</Card>

	<Card as="section" class="p-0" aria-labelledby="goals">
		<h2 id="goals" class="sr-only">Goals</h2>
		<a
			href={resolve('/settings/targets')}
			class="flex min-h-14 items-center gap-3 rounded-card px-5 py-3 text-ink no-underline hover:bg-surface-2"
		>
			<Icon name="nutrition" size={22} />
			<span class="flex-1 font-semibold">Nutrition targets</span>
			<Icon name="forward" size={20} />
		</a>
		<a
			href={resolve('/settings/gyms')}
			class="flex min-h-14 items-center gap-3 rounded-card border-t border-line px-5 py-3 text-ink no-underline hover:bg-surface-2"
		>
			<Icon name="train" size={22} />
			<span class="flex-1 font-semibold">Gym profiles</span>
			<Icon name="forward" size={20} />
		</a>
	</Card>

	<Card as="section" aria-labelledby="account">
		<h2 id="account" class="mt-0 mb-1 text-title">Account</h2>
		<p class="mt-0 mb-4 text-ink-2">Signed in as {auth.session?.user.email}</p>
		<SignOut />
	</Card>

	<SyncCard />

	{#if showDevRoutes}
		<Card as="section" aria-labelledby="dev">
			<h2 id="dev" class="mt-0 mb-2 text-title">Development</h2>
			<ul class="m-0 flex list-none flex-col p-0">
				<li>
					<a href={resolve('/trainer/clients')} class="inline-flex min-h-11 items-center"
						>Trainer workspace</a
					>
				</li>
				<li>
					<a href={resolve('/dev/components')} class="inline-flex min-h-11 items-center"
						>Component gallery</a
					>
				</li>
			</ul>
		</Card>
	{/if}
</div>
