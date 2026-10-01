<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import { asFood, logFood, type FoodLogRow, type FoodRow } from '$lib/data/nutrition';
	import { del } from '$lib/data/repo';
	import { eatenAt, type MealSlot } from '$lib/domain/day';
	import { defaultAmount, nutrientsFor, unitOf, type Amount } from '$lib/domain/food';
	import { formatInt } from '$lib/format';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import SegmentedControl from '$lib/ui/SegmentedControl.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Log a food (or edit/delete a logged one): amount in g/ml or servings, meal, live nutrients.
	type Props = {
		open: boolean;
		food: FoodRow | null;
		log?: FoodLogRow | null;
		slot: MealSlot;
		date: string;
		tz: string;
		onlogged?: () => void;
	};
	let { open = $bindable(), food, log = null, slot, date, tz, onlogged }: Props = $props();

	const SLOTS: { value: MealSlot; label: string }[] = [
		{ value: 'breakfast', label: 'Breakfast' },
		{ value: 'lunch', label: 'Lunch' },
		{ value: 'snack', label: 'Snack' },
		{ value: 'dinner', label: 'Dinner' }
	];

	let unit = $state('');
	let qty = $state('');
	let mealSlot = $state<MealSlot>('breakfast');
	let error = $state('');
	let busy = $state(false);

	const f = $derived(food ? asFood(food) : null);
	const units = $derived(
		f
			? [
					...(f.per100 ? [{ value: unitOf(f), label: unitOf(f) }] : []),
					...f.servings.map((s) => ({ value: s.label, label: s.label }))
				]
			: []
	);

	// Reset the form each time the sheet opens.
	$effect(() => {
		if (!open || !f) return;
		const a: Amount = log
			? log.servings != null
				? { servings: Number(log.servings), label: log.serving_label ?? '' }
				: { grams: Number(log.grams) }
			: defaultAmount(f);
		unit = 'grams' in a ? unitOf(f) : a.label;
		qty = String('grams' in a ? a.grams : a.servings);
		mealSlot = (log?.meal_slot as MealSlot | null) ?? slot;
		error = '';
	});

	const n = $derived(Number(qty.replace(',', '.')));
	const amount = $derived<Amount | null>(
		!f || !(n > 0)
			? null
			: unit === 'g' || unit === 'ml'
				? { grams: n }
				: { servings: n, label: unit }
	);
	const preview = $derived(f && amount ? nutrientsFor(f, amount) : null);

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (!food || !local.db || !auth.session) return;
		if (!amount || n > 5000) {
			error = 'Enter an amount greater than 0.';
			return;
		}
		busy = true;
		try {
			const at =
				log && log.meal_slot === mealSlot ? log.eaten_at : eatenAt(date, mealSlot, new Date(), tz);
			await logFood(local.db, auth.session.user.id, food, amount, mealSlot, at, log ?? undefined);
			toast(log ? `Updated ${food.name}.` : `Logged ${food.name}.`, 'ok');
			open = false;
			onlogged?.();
		} catch {
			error = 'We couldn’t save that on this device. Try again.';
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!log || !local.db) return;
		await del(local.db, 'food_logs', log.id);
		toast(`Removed ${log.name}.`);
		open = false;
	}
</script>

<Sheet bind:open title={food?.name ?? 'Log food'}>
	{#if f}
		<form id="log-food" class="flex flex-col gap-4" onsubmit={save} novalidate>
			{#if units.length > 1}
				<SegmentedControl legend="Measure in" options={units} bind:value={unit} />
			{/if}
			<Field
				label={unit === 'g' || unit === 'ml' ? `Amount (${unit})` : `Number of servings (${unit})`}
				inputmode="decimal"
				bind:value={qty}
				{error}
			/>
			<SegmentedControl legend="Meal" options={SLOTS} bind:value={mealSlot} />
			<p class="m-0 text-ink-2 nums" aria-live="polite">
				{#if preview}
					<span class="font-semibold text-ink">{formatInt(preview.kcal)} kcal</span> · protein {preview.protein_g}
					g · carbs {preview.carbs_g} g · fat {preview.fat_g} g
				{:else}
					Enter an amount to see the nutrition.
				{/if}
			</p>
		</form>
	{/if}
	{#snippet footer()}
		<div class="flex flex-col gap-2 sm:flex-row-reverse">
			<Button type="submit" form="log-food" {busy} full
				>{log ? 'Save changes' : 'Add to log'}</Button
			>
			{#if log}
				<Button variant="destructive" onclick={remove}>Remove from log</Button>
			{/if}
		</div>
	{/snippet}
</Sheet>
