<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import { put } from '$lib/data/repo';
	import type { LocalRow } from '$lib/data/tables';
	import { changeLabel, weightTrend } from '$lib/domain/weight';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Weight trend (7-day average). The change stays neutral text: whether a loss is good depends on
	// the goal (DESIGN-SYSTEM §2), which onboarding records from Phase 2.
	type Props = { metrics: LocalRow<'body_metrics'>[]; today: string };
	let { metrics, today }: Props = $props();

	const trend = $derived(weightTrend(metrics, today));
	const todays = $derived(metrics.find((m) => m.date === today && !m.deleted));

	let open = $state(false);
	let value = $state('');
	let error = $state('');

	function openSheet() {
		value =
			todays?.weight_kg != null ? String(todays.weight_kg) : (trend?.latest.kg.toString() ?? '');
		error = '';
		open = true;
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		const kg = Number(value.replace(',', '.'));
		if (!value.trim() || !Number.isFinite(kg) || kg < 20 || kg > 400) {
			error = 'Enter your weight in kg, for example 72.4.';
			return;
		}
		if (!local.db || !auth.session) return;
		// One entry per day: update today's if there is one.
		await put(local.db, 'body_metrics', {
			...(todays ?? {
				id: crypto.randomUUID(),
				user_id: auth.session.user.id,
				date: today,
				waist_cm: null,
				chest_cm: null,
				arm_cm: null,
				thigh_cm: null,
				steps: null,
				notes: null,
				deleted: false
			}),
			weight_kg: Math.round(kg * 100) / 100,
			up: 0
		});
		open = false;
		toast(`Logged ${kg} kg.`, 'ok');
	}
</script>

<Card as="section" class="flex flex-col gap-3" aria-labelledby="weight-today">
	<h2 id="weight-today" class="m-0 label text-ink-2">Weight · 7-day avg</h2>
	{#if trend}
		<p class="m-0 nums">
			<span class="text-[1.75rem] leading-8 font-semibold">{trend.average.toFixed(1)}</span>
			<span class="text-ink-2"> kg</span>
		</p>
		<p class="m-0 text-[0.9375rem] text-ink-2 nums">
			{trend.change === null ? 'Log a few more days to see the trend' : changeLabel(trend.change)}
		</p>
	{:else}
		<p class="m-0 text-ink-2">No weight in the last 7 days.</p>
	{/if}
	<div>
		<Button variant="secondary" compact onclick={openSheet}>
			{todays ? 'Edit today’s weight' : 'Log weight'}
		</Button>
	</div>
</Card>

<Sheet bind:open title="Log weight">
	<form id="weight-form" onsubmit={save} novalidate>
		<Field label="Weight today (kg)" inputmode="decimal" bind:value {error} autocomplete="off" />
	</form>
	{#snippet footer()}
		<Button type="submit" form="weight-form" full>Save</Button>
	{/snippet}
</Sheet>
