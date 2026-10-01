<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';
	import { showDevRoutes } from '$lib/dev';
	import { supabase } from '$lib/supabase/client';
	import { setTheme, theme, type ThemePref } from '$lib/theme/theme.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import SegmentedControl from '$lib/ui/SegmentedControl.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	let pref = $state<ThemePref>(theme.pref);
	$effect(() => setTheme(pref));

	let busy = $state(false);
	async function signOut() {
		busy = true;
		// Local scope: signing out works offline and only ends this device's session.
		const { error } = await supabase!.auth.signOut({ scope: 'local' });
		busy = false;
		if (error) return toast('We couldn’t sign you out. Try again.', 'warn');
		await goto(resolve('/sign-in'), { replaceState: true });
	}
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

	<Card as="section" aria-labelledby="account">
		<h2 id="account" class="mt-0 mb-1 text-title">Account</h2>
		<p class="mt-0 mb-4 text-ink-2">Signed in as {auth.session?.user.email}</p>
		<Button variant="secondary" {busy} onclick={signOut}>
			<Icon name="signout" size={20} />Sign out
		</Button>
	</Card>

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
