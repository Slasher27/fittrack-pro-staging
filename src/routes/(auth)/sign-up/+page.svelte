<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { localDate } from '$lib/domain/dates';
	import { signUpMetadata, validateSignUp, type SignUpErrors } from '$lib/domain/signup';
	import { net } from '$lib/net.svelte';
	import { supabase } from '$lib/supabase/client';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Notice from '$lib/ui/Notice.svelte';

	let input = $state({ displayName: '', email: '', password: '', birthDate: '', consent: false });
	let errors = $state<SignUpErrors>({});
	let busy = $state(false);
	let error = $state('');
	let checkEmail = $state(false);
	const today = localDate(new Date());

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!supabase) return;
		errors = validateSignUp(input, today);
		if (Object.keys(errors).length) {
			// Move focus to the first invalid field so screen-reader users hear the error.
			queueMicrotask(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
			return;
		}
		busy = true;
		error = '';
		const { data, error: err } = await supabase.auth.signUp({
			email: input.email.trim(),
			password: input.password,
			options: { data: signUpMetadata(input), emailRedirectTo: `${location.origin}/today` }
		});
		busy = false;
		if (err) {
			error =
				err.code === 'user_already_exists' || err.code === 'email_exists'
					? 'There’s already an account with that email. Sign in instead.'
					: err.code === 'weak_password'
						? 'Choose a stronger password.'
						: 'We couldn’t create your account. Check your connection and try again.';
			return;
		}
		if (data.session) await goto(resolve('/today'), { replaceState: true });
		else checkEmail = true; // Hosted projects with email confirmation on.
	}
</script>

<svelte:head><title>Create account · FitTrack Pro</title></svelte:head>

<h1 class="m-0 text-display">Create account</h1>

{#if checkEmail}
	<Notice tone="ok">Check your email for a link to confirm your account, then sign in.</Notice>
{:else}
	<form class="flex flex-col gap-4" onsubmit={submit} novalidate>
		{#if error}<Notice tone="warn" alert>{error}</Notice>{/if}
		<Field
			label="Your name"
			autocomplete="name"
			required
			bind:value={input.displayName}
			error={errors.displayName}
		/>
		<Field
			label="Email"
			type="email"
			autocomplete="email"
			required
			bind:value={input.email}
			error={errors.email}
		/>
		<Field
			label="Password"
			type="password"
			autocomplete="new-password"
			hint="At least 8 characters."
			required
			bind:value={input.password}
			error={errors.password}
		/>
		<Field
			label="Date of birth"
			type="date"
			autocomplete="bday"
			hint="FitTrack Pro is for adults (18 or older). We keep only your birth year."
			max={today}
			required
			bind:value={input.birthDate}
			error={errors.birthDate}
		/>

		<div class="flex flex-col gap-1.5">
			<label
				class="flex cursor-pointer items-start gap-3 rounded-control border border-line bg-surface p-4"
			>
				<input
					type="checkbox"
					bind:checked={input.consent}
					aria-invalid={errors.consent ? true : undefined}
					aria-describedby={errors.consent ? 'consent-error' : undefined}
					class="mt-0.5 size-6 shrink-0 accent-brand"
				/>
				<span class="text-[0.9375rem]">
					I agree that FitTrack Pro may store and process my health information (what I eat, my body
					measurements and photos, and my workouts) to run the app for me. Nobody else sees it
					unless I choose to share it with a coach.
				</span>
			</label>
			{#if errors.consent}
				<p
					id="consent-error"
					class="m-0 flex items-start gap-1.5 text-[0.875rem] font-medium text-warn-ink"
				>
					<Icon name="warning" size={18} class="mt-px shrink-0" />{errors.consent}
				</p>
			{/if}
		</div>

		<Button type="submit" full {busy} disabled={!supabase || !net.online}>
			{busy ? 'Creating account…' : 'Create account'}
		</Button>
	</form>
{/if}

<p class="m-0 text-[0.9375rem] text-ink-2">
	Already have an account? <a href={resolve('/sign-in')} class="inline-flex min-h-11 items-center"
		>Sign in</a
	>
</p>
