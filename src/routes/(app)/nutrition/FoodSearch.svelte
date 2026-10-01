<script lang="ts">
	import type { FoodRow } from '$lib/data/nutrition';
	import { asFood } from '$lib/data/nutrition';
	import { foodSummary, searchFoods } from '$lib/domain/food';
	import Button from '$lib/ui/Button.svelte';
	import Icon from '$lib/ui/Icon.svelte';

	// Search the member's foods and the shared library (offline: it's all on the device).
	// Tick several results to add them at once (multi-add), or tap one to choose the amount.
	type Props = {
		foods: FoodRow[];
		recentIds: string[];
		query: string;
		onpick: (food: FoodRow) => void;
		onadd: (foods: FoodRow[]) => void;
		oncreate: (name: string) => void;
	};
	let { foods, recentIds, query = $bindable(), onpick, onadd, oncreate }: Props = $props();

	let selected = $state<string[]>([]);
	const results = $derived(searchFoods(foods.map(asFood), query, recentIds));
	$effect(() => {
		void query;
		selected = [];
	});

	function addSelected() {
		const chosen = foods.filter((f) => selected.includes(f.id));
		selected = [];
		onadd(chosen);
	}
</script>

<div class="flex flex-col gap-1.5">
	<label for="food-search" class="text-[0.875rem] font-semibold">Search foods</label>
	<input
		id="food-search"
		type="search"
		bind:value={query}
		autocomplete="off"
		placeholder="e.g. oats, biltong, rice"
		aria-controls={query.trim() ? 'food-results' : undefined}
		class="min-h-12 w-full rounded-control border border-line-strong bg-surface px-3.5 text-body text-ink placeholder:text-ink-2"
	/>
</div>

{#if query.trim()}
	<section id="food-results" aria-label="Search results" class="flex flex-col">
		<p role="status" class="sr-only">
			{results.length}
			{results.length === 1 ? 'food' : 'foods'} found
		</p>
		{#if results.length}
			<ul class="m-0 list-none rounded-card border border-line bg-surface p-0">
				{#each results as f (f.id)}
					<li class="flex items-center border-b border-line last:border-b-0">
						<label class="grid min-h-14 w-12 shrink-0 cursor-pointer place-items-center">
							<input
								type="checkbox"
								value={f.id}
								bind:group={selected}
								aria-label="Select {f.name}"
								class="size-5 accent-brand"
							/>
						</label>
						<button
							type="button"
							class="flex min-h-14 min-w-0 flex-1 items-center gap-2 py-2 pr-4 text-left hover:bg-surface-2"
							onclick={() => onpick(f)}
						>
							<span class="min-w-0 flex-1">
								<span class="block truncate font-semibold">{f.name}</span>
								<span class="block truncate text-[0.875rem] text-ink-2">
									{f.brand ? `${f.brand} · ` : ''}{foodSummary(f)}
								</span>
							</span>
							<Icon name="forward" size={20} />
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="m-0 py-3 text-ink-2">No foods match “{query.trim()}”.</p>
		{/if}
		<div class="mt-3 flex flex-wrap gap-2">
			{#if selected.length}
				<Button onclick={addSelected}>
					Add {selected.length}
					{selected.length === 1 ? 'food' : 'foods'}
				</Button>
			{/if}
			<Button variant="secondary" onclick={() => oncreate(query.trim())}>
				<Icon name="plus" size={20} />Create “{query.trim()}”
			</Button>
		</div>
	</section>
{/if}
