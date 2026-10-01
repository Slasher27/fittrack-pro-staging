<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import { saveFood, type FoodRow } from '$lib/data/nutrition';
	import { validateFoodForm, type FoodForm, type FoodFormErrors } from '$lib/domain/food';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Create one of your own foods: by weight (per 100 g), volume (per 100 ml) or count ("1 rusk").
	type Props = { open: boolean; name?: string; onsaved: (food: FoodRow) => void };
	let { open = $bindable(), name = '', onsaved }: Props = $props();

	const empty = (): FoodForm => ({
		name,
		brand: '',
		basis: 'g',
		servingLabel: '',
		servingGrams: '',
		kcal: '',
		protein_g: '',
		carbs_g: '',
		fat_g: ''
	});
	let form = $state<FoodForm>(empty());
	let errors = $state<FoodFormErrors>({});
	let busy = $state(false);

	$effect(() => {
		if (open) {
			form = empty();
			errors = {};
		}
	});

	const per = $derived(
		form.basis === 'serving' ? form.servingLabel.trim() || 'serving' : `100 ${form.basis}`
	);

	async function save(e: SubmitEvent) {
		e.preventDefault();
		errors = validateFoodForm(form);
		if (Object.keys(errors).length) {
			queueMicrotask(() =>
				document.querySelector<HTMLElement>('#food-form [aria-invalid="true"]')?.focus()
			);
			return;
		}
		if (!local.db || !auth.session) return;
		busy = true;
		try {
			const food = await saveFood(local.db, auth.session.user.id, form);
			toast(`Saved ${food.name} to your foods.`, 'ok');
			open = false;
			onsaved(food as FoodRow);
		} catch {
			toast('We couldn’t save that food. Try again.', 'warn');
		} finally {
			busy = false;
		}
	}
</script>

<Sheet bind:open title="New food">
	<form id="food-form" class="flex flex-col gap-4" onsubmit={save} novalidate>
		<Field label="Name" bind:value={form.name} error={errors.name} autocomplete="off" />
		<Field label="Brand (optional)" bind:value={form.brand} autocomplete="off" />

		<fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
			<legend class="mb-1 text-[0.875rem] font-semibold">Nutrition label is per</legend>
			{#each [['g', '100 g (by weight)'], ['ml', '100 ml (drinks)'], ['serving', 'One serving, like “1 egg”']] as [value, label] (value)}
				<label class="flex min-h-11 cursor-pointer items-center gap-3">
					<input
						type="radio"
						name="basis"
						{value}
						bind:group={form.basis}
						class="size-5 accent-brand"
					/>
					{label}
				</label>
			{/each}
		</fieldset>

		{#if form.basis === 'serving'}
			<Field
				label="One serving is"
				placeholder="1 egg"
				bind:value={form.servingLabel}
				error={errors.servingLabel}
			/>
			<Field
				label="Serving weight (g, optional)"
				inputmode="decimal"
				hint="With the weight you can also log this food in grams."
				bind:value={form.servingGrams}
				error={errors.servingGrams}
			/>
		{/if}

		<Field
			label="Calories per {per} (kcal)"
			inputmode="decimal"
			bind:value={form.kcal}
			error={errors.kcal}
		/>
		<Field
			label="Protein per {per} (g)"
			inputmode="decimal"
			bind:value={form.protein_g}
			error={errors.protein_g}
		/>
		<Field
			label="Carbs per {per} (g)"
			inputmode="decimal"
			bind:value={form.carbs_g}
			error={errors.carbs_g}
		/>
		<Field
			label="Fat per {per} (g)"
			inputmode="decimal"
			bind:value={form.fat_g}
			error={errors.fat_g}
		/>
	</form>
	{#snippet footer()}
		<Button type="submit" form="food-form" {busy} full>Save food</Button>
	{/snippet}
</Sheet>
