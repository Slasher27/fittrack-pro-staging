<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import { asFood, saveRecipe, type FoodRow } from '$lib/data/nutrition';
	import {
		canBeIngredient,
		recipePer100,
		recipeTotals,
		searchFoods,
		validateRecipe,
		type Ingredient,
		type RecipeErrors
	} from '$lib/domain/food';
	import { formatInt } from '$lib/format';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import IconButton from '$lib/ui/IconButton.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Recipes: raw ingredients in grams + the weight of the whole cooked pot → per 100 g cooked.
	// Weighing the finished pot matters: water loss is what makes eyeballing wrong (v3).
	type Props = {
		open: boolean;
		foods: FoodRow[];
		recipe?: FoodRow | null;
		/** `created` is false after editing an existing recipe. */
		onsaved: (f: FoodRow, created: boolean) => void;
	};
	let { open = $bindable(), foods, recipe = null, onsaved }: Props = $props();

	let name = $state('');
	let ingredients = $state<Ingredient[]>([]);
	let cooked = $state('');
	let q = $state('');
	let grams = $state('');
	let addError = $state('');
	let errors = $state<RecipeErrors>({});
	let busy = $state(false);

	$effect(() => {
		if (!open) return;
		name = recipe?.name ?? '';
		ingredients = (recipe?.ingredients as Ingredient[] | null)?.map((i) => ({ ...i })) ?? [];
		cooked = recipe?.cooked_g ? String(recipe.cooked_g) : '';
		q = grams = addError = '';
		errors = {};
	});

	const byId = $derived(new Map(foods.map((f) => [f.id, asFood(f)])));
	const usable = $derived(
		foods.map(asFood).filter((f) => canBeIngredient(f) && f.id !== recipe?.id)
	);
	const matches = $derived(searchFoods(usable, q, [], 6));
	let chosen = $state<string | null>(null);
	$effect(() => {
		void q;
		chosen = null;
	});

	const totals = $derived(recipeTotals(ingredients, byId));
	const cookedG = $derived(Number(cooked.replace(',', '.')));
	const per100 = $derived(cookedG > 0 && ingredients.length ? recipePer100(totals, cookedG) : null);

	function add() {
		const g = Number(grams.replace(',', '.'));
		const id = chosen ?? (matches.length === 1 ? matches[0].id : null);
		if (!id) return (addError = 'Choose a food from the list.');
		if (!(g > 0 && g <= 20_000)) return (addError = 'Enter the raw weight in grams.');
		ingredients = [...ingredients, { food_id: id, grams: g }];
		q = grams = addError = '';
		document.getElementById('recipe-ingredient')?.focus();
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		errors = validateRecipe(name, ingredients, cookedG);
		if (Object.keys(errors).length || !per100 || !local.db || !auth.session) return;
		busy = true;
		try {
			const food = await saveRecipe(
				local.db,
				auth.session.user.id,
				{ name, ingredients: $state.snapshot(ingredients), cookedG, per100 },
				recipe ?? undefined
			);
			toast(recipe ? `Updated ${food.name}.` : `Saved ${food.name}. Log it by grams.`, 'ok');
			open = false;
			onsaved(food as FoodRow, !recipe);
		} catch {
			toast('We couldn’t save the recipe. Try again.', 'warn');
		} finally {
			busy = false;
		}
	}
</script>

<Sheet bind:open title={recipe ? 'Edit recipe' : 'New recipe'}>
	<form id="recipe-form" class="flex flex-col gap-4" onsubmit={save} novalidate>
		<p class="m-0 text-ink-2">
			Add the raw ingredients, then weigh the whole pot once it’s cooked. From then on you log it by
			grams, like “220 g of beef curry”.
		</p>
		<Field label="Recipe name" bind:value={name} error={errors.name} autocomplete="off" />

		<section aria-labelledby="ingredients-heading" class="flex flex-col gap-2">
			<h3 id="ingredients-heading" class="m-0 text-[0.875rem] font-semibold">Ingredients</h3>
			{#if ingredients.length}
				<ul class="m-0 list-none rounded-card border border-line p-0">
					{#each ingredients as ing, i (i)}
						<li class="flex items-center gap-2 border-b border-line py-1 pr-1 pl-4 last:border-b-0">
							<span class="min-w-0 flex-1 truncate"
								>{byId.get(ing.food_id)?.name ?? 'Deleted food'}</span
							>
							<span class="text-ink-2 nums">{formatInt(ing.grams)} g</span>
							<IconButton
								icon="close"
								label="Remove {byId.get(ing.food_id)?.name ?? 'ingredient'}"
								onclick={() => (ingredients = ingredients.filter((_, j) => j !== i))}
							/>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="m-0 text-ink-2">No ingredients yet.</p>
			{/if}
			{#if errors.ingredients}<Notice tone="warn">{errors.ingredients}</Notice>{/if}

			<div class="flex flex-col gap-2 rounded-card bg-surface-2 p-3">
				<Field
					id="recipe-ingredient"
					label="Add an ingredient"
					placeholder="Search your foods"
					bind:value={q}
					autocomplete="off"
				/>
				{#if q.trim()}
					{#if matches.length}
						<fieldset class="m-0 border-0 p-0">
							<legend class="sr-only">Choose the food</legend>
							{#each matches as f (f.id)}
								<label class="flex min-h-11 cursor-pointer items-center gap-3">
									<input
										type="radio"
										name="recipe-food"
										value={f.id}
										bind:group={chosen}
										class="size-5 accent-brand"
									/>
									{f.name}
								</label>
							{/each}
						</fieldset>
					{:else}
						<p class="m-0 text-[0.9375rem] text-ink-2">
							No weight-based food matches. Count foods like “1 egg” can’t go in by count: create
							the food with its weight per 100 g first (1 egg ≈ 50 g).
						</p>
					{/if}
				{/if}
				<Field label="Raw weight (g)" inputmode="decimal" bind:value={grams} error={addError} />
				<div>
					<Button variant="secondary" compact onclick={add}
						><Icon name="plus" size={20} />Add ingredient</Button
					>
				</div>
			</div>
		</section>

		<Field
			label="Cooked weight of the whole recipe (g)"
			inputmode="decimal"
			hint="Weigh the pot once it’s cooked, minus the pot."
			bind:value={cooked}
			error={errors.cooked}
		/>

		{#if ingredients.length}
			<p class="m-0 text-ink-2 nums" aria-live="polite">
				Whole recipe: <span class="font-semibold text-ink">{formatInt(totals.kcal)} kcal</span> from
				{formatInt(totals.raw_g)} g raw{#if per100}. Per 100 g cooked:
					<span class="font-semibold text-ink">{per100.kcal} kcal</span> · protein {per100.protein_g}
					g · carbs {per100.carbs_g} g · fat {per100.fat_g} g{/if}.
			</p>
		{/if}
	</form>
	{#snippet footer()}
		<Button type="submit" form="recipe-form" {busy} full
			>{recipe ? 'Save changes' : 'Save recipe'}</Button
		>
	{/snippet}
</Sheet>
