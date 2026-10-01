<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';
	import { MIN_PASSWORD_LENGTH } from '$lib/domain/signup';
	import { net } from '$lib/net.svelte';
	import { supabase } from '$lib/supabase/client';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Two steps on one route: request a link by email, then (arriving from the link) set a new password.
	let email = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state('');
	let fieldError = $state('');
	let sent = $state(false);

	async function request(e: SubmitEvent) {
		e.preventDefault();
		if (!supabase) return;
		busy = true;
		error = '';
		const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
			redirectTo: `${location.origin}/reset`
		});
		busy = false;
		// Same message whether or not the account exists, so the form can't be used to probe emails.
		if (err && err.status !== 400) error = 'We couldn’t send the email. Try again in a minute.';
		else sent = true;
	}

	async function setPassword(e: SubmitEvent) {
		e.preventDefault();
		if (!supabase) return;
		fieldError =
			password.length < MIN_PASSWORD_LENGTH
				? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
				: '';
		if (fieldError) return;
		busy = true;
		error = '';
		const { error: err } = await supabase.auth.updateUser({ password });
		busy = false;
		if (err) {
			error = 'We couldn’t save your new password. Open the link from your email again.';
			return;
		}
		auth.recovering = false;
		toast('Password changed.', 'ok');
		await goto(resolve('/today'), { replaceState: true });
	}
</script>

<svelte:head><title>Reset password · FitTrack Pro</title></svelte:head>

{#if auth.recovering}
	<h1 class="m-0 text-display">Choose a new password</h1>
	<form class="flex flex-col gap-4" onsubmit={setPassword} novalidate>
		{#if error}<Notice tone="warn" alert>{error}</Notice>{/if}
		<Field
			label="New password"
			type="password"
			autocomplete="new-password"
			hint="At least 8 characters."
			required
			bind:value={password}
			error={fieldError}
		/>
		<Button type="submit" full {busy} disabled={!net.online}>
			{busy ? 'Saving…' : 'Save password'}
		</Button>
	</form>
{:else}
	<h1 class="m-0 text-display">Reset password</h1>
	{#if sent}
		<Notice tone="ok"
			>If there’s an account for {email.trim()}, we’ve emailed it a link to reset the password.</Notice
		>
	{:else}
		<p class="m-0 text-ink-2">
			Enter your email and we’ll send you a link to choose a new password.
		</p>
		<form class="flex flex-col gap-4" onsubmit={request} novalidate>
			{#if error}<Notice tone="warn" alert>{error}</Notice>{/if}
			<Field label="Email" type="email" autocomplete="email" required bind:value={email} />
			<Button type="submit" full {busy} disabled={!supabase || !net.online}>
				{busy ? 'Sending…' : 'Send reset link'}
			</Button>
		</form>
	{/if}
	<a href={resolve('/sign-in')} class="inline-flex min-h-11 items-center text-[0.9375rem]"
		>Back to sign in</a
	>
{/if}
