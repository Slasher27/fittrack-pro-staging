<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { safeNext } from '$lib/nav';
	import { net } from '$lib/net.svelte';
	import { supabase } from '$lib/supabase/client';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Notice from '$lib/ui/Notice.svelte';

	let email = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state('');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!supabase) return;
		busy = true;
		error = '';
		const { error: err } = await supabase.auth.signInWithPassword({
			email: email.trim(),
			password
		});
		busy = false;
		if (err) {
			error =
				err.code === 'invalid_credentials'
					? 'That email and password don’t match. Check them, or reset your password.'
					: 'We couldn’t sign you in. Check your connection and try again.';
			return;
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- safeNext() allows same-origin paths only
		await goto(safeNext(page.url.searchParams.get('next')), { replaceState: true });
	}
</script>

<svelte:head><title>Sign in · FitTrack Pro</title></svelte:head>

<h1 class="m-0 text-display">Sign in</h1>

<form class="flex flex-col gap-4" onsubmit={submit} novalidate>
	{#if error}<Notice tone="warn" alert>{error}</Notice>{/if}
	<Field label="Email" type="email" autocomplete="email" required bind:value={email} />
	<Field
		label="Password"
		type="password"
		autocomplete="current-password"
		required
		bind:value={password}
	/>
	<Button type="submit" full {busy} disabled={!supabase || !net.online}>
		{busy ? 'Signing in…' : 'Sign in'}
	</Button>
</form>

<div class="flex flex-col gap-2 text-[0.9375rem]">
	<a href={resolve('/reset')} class="inline-flex min-h-11 items-center">Forgot your password?</a>
	<p class="m-0 text-ink-2">
		New here? <a href={resolve('/sign-up')} class="inline-flex min-h-11 items-center"
			>Create an account</a
		>
	</p>
</div>
