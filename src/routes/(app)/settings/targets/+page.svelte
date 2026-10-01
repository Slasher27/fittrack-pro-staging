<script lang="ts">
	import { resolve } from '$app/paths';
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import { list, put } from '$lib/data/repo';
	import type { LocalRow } from '$lib/data/tables';
	import { localDate } from '$lib/domain/dates';
	import {
		currentTarget,
		macroKcal,
		validateTargets,
		type TargetsErrors,
		type TargetsInput
	} from '$lib/domain/targets';
	import { formatInt } from '$lib/format';
	import { net } from '$lib/net.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Set nutrition targets by hand (ROADMAP Phase 1; onboarding computes them from Phase 2).
	// Append-only: saving adds a row effective today (ARCHITECTURE §3).
	type Form = Record<keyof TargetsInput, string>;
	const blank: Form = {
		kcal: '',
		kcal_train: '',
		protein_g: '',
		carbs_g: '',
		fat_g: '',
		water_ml: '3000'
	};

	let form = $state<Form>({ ...blank });
	let current = $state<LocalRow<'targets'> | undefined>();
	let loaded = $state(false);
	let dirty = $state(false);
	let errors = $state<TargetsErrors>({});
	let busy = $state(false);
	let failed = $state(false);

	const toForm = (t: LocalRow<'targets'>): Form => ({
		kcal: String(t.kcal),
		kcal_train: t.kcal_train === null ? '' : String(t.kcal_train),
		protein_g: String(t.protein_g),
		carbs_g: String(t.carbs_g),
		fat_g: String(t.fat_g),
		water_ml: String(t.water_ml)
	});
	const int = (s: string) => (s.trim() === '' ? NaN : Number(s));
	const parsed = $derived<TargetsInput>({
		kcal: int(form.kcal),
		kcal_train: form.kcal_train.trim() === '' ? null : int(form.kcal_train),
		protein_g: int(form.protein_g),
		carbs_g: int(form.carbs_g),
		fat_g: int(form.fat_g),
		water_ml: int(form.water_ml)
	});
	const fromMacros = $derived(macroKcal(parsed));

	// Re-read after every local write or pulled sync; never overwrite what the member is typing.
	$effect(() => {
		void local.version;
		const db = local.db;
		if (!db) return;
		list(db, 'targets').then((rows) => {
			current = currentTarget(rows, localDate(new Date()));
			loaded = true;
			if (!dirty) form = current ? toForm(current) : { ...blank };
		});
	});

	async function save(e: SubmitEvent) {
		e.preventDefault();
		errors = validateTargets(parsed);
		if (Object.keys(errors).length) {
			queueMicrotask(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
			return;
		}
		if (!local.db || !auth.session) return;
		busy = true;
		failed = false;
		try {
			await put(local.db, 'targets', {
				id: crypto.randomUUID(),
				user_id: auth.session.user.id,
				effective_from: localDate(new Date()),
				...(parsed as Required<TargetsInput>),
				set_by: 'self',
				set_by_id: null,
				up: 0,
				deleted: false
			});
			dirty = false;
			toast(
				net.online
					? 'Targets saved.'
					: 'Targets saved on this device. They’ll sync when you’re online.',
				'ok'
			);
		} catch {
			failed = true;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head><title>Nutrition targets · FitTrack Pro</title></svelte:head>

<a
	href={resolve('/settings')}
	class="mb-2 -ml-2 inline-flex min-h-11 items-center gap-1 pr-2 font-semibold no-underline"
>
	<Icon name="back" size={20} />Settings
</a>
<h1 class="mt-0 mb-2 text-display">Nutrition targets</h1>
<p class="mt-0 mb-6 text-ink-2">Your daily goals. Today and Nutrition measure against them.</p>

{#if !loaded}
	<p role="status" class="text-ink-2">Loading your targets…</p>
{:else}
	<form class="flex flex-col gap-4" onsubmit={save} oninput={() => (dirty = true)} novalidate>
		{#if failed}
			<Notice tone="warn" alert>We couldn’t save your targets on this device. Try again.</Notice>
		{/if}
		{#if !current}
			<Notice
				>You haven’t set targets yet. Enter your own, or wait for the setup questions in a later
				update.</Notice
			>
		{/if}
		{#if !net.online}
			<Notice
				>You’re offline. Your targets save on this device and sync when you’re back online.</Notice
			>
		{/if}

		<Card as="section" class="flex flex-col gap-4" aria-labelledby="energy">
			<h2 id="energy" class="m-0 text-title">Calories</h2>
			<Field
				label="Calories per day (kcal)"
				inputmode="numeric"
				bind:value={form.kcal}
				error={errors.kcal}
				required
			/>
			<Field
				label="Calories on training days (kcal, optional)"
				inputmode="numeric"
				hint="Leave empty to use the same target every day."
				bind:value={form.kcal_train}
				error={errors.kcal_train}
			/>
		</Card>

		<Card as="section" class="flex flex-col gap-4" aria-labelledby="macros">
			<h2 id="macros" class="m-0 text-title">Macros</h2>
			<Field
				label="Protein (g)"
				inputmode="numeric"
				bind:value={form.protein_g}
				error={errors.protein_g}
				required
			/>
			<Field
				label="Carbs (g)"
				inputmode="numeric"
				bind:value={form.carbs_g}
				error={errors.carbs_g}
				required
			/>
			<Field
				label="Fat (g)"
				inputmode="numeric"
				bind:value={form.fat_g}
				error={errors.fat_g}
				required
			/>
			{#if Number.isFinite(fromMacros)}
				<p class="m-0 text-[0.9375rem] text-ink-2 nums">
					These macros add up to {formatInt(fromMacros)} kcal{#if Number.isFinite(parsed.kcal)},
						{Math.abs(fromMacros - parsed.kcal) <= 50
							? 'which matches your calorie target.'
							: `${formatInt(Math.abs(fromMacros - parsed.kcal))} kcal ${fromMacros > parsed.kcal ? 'more' : 'less'} than your calorie target.`}{/if}
				</p>
			{/if}
		</Card>

		<Card as="section" class="flex flex-col gap-4" aria-labelledby="water">
			<h2 id="water" class="m-0 text-title">Water</h2>
			<Field
				label="Water per day (ml)"
				inputmode="numeric"
				bind:value={form.water_ml}
				error={errors.water_ml}
				required
			/>
		</Card>

		<Button type="submit" full {busy}>{busy ? 'Saving…' : 'Save targets'}</Button>
	</form>
{/if}
