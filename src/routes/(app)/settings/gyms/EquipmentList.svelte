<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { setCatalogItem, type GymRow, type ItemRow } from '$lib/data/gyms';
	import { local } from '$lib/data/local.svelte';
	import { CATALOG, CATEGORIES, type CatalogItem } from '$lib/domain/catalog';
	import { weightsLabel, type Weights } from '$lib/domain/equipment';
	import Button from '$lib/ui/Button.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import WeightsSheet from './WeightsSheet.svelte';

	// Catalogue items by category: a checkbox each, and "Edit weights" beside (never inside) the
	// label for items with weights (DESIGN-SYSTEM §7.1).
	type Props = { gym: GymRow; items: ItemRow[] };
	let { gym, items }: Props = $props();

	let weightsOpen = $state(false);
	let weighing = $state<{ item: CatalogItem; row: ItemRow } | null>(null);

	const rowFor = (id: string) => items.find((i) => i.catalog_id === id);
	const groups = CATEGORIES.map((c) => ({
		...c,
		items: CATALOG.filter((i) => i.category === c.id)
	}));

	async function toggle(item: CatalogItem, on: boolean) {
		if (!local.db || !auth.session) return;
		try {
			await setCatalogItem(local.db, auth.session.user.id, gym.id, item, on);
		} catch {
			toast('We couldn’t save that on this device. Try again.', 'warn');
			local.version++; // re-read, so the box shows what is actually saved
		}
	}

	function editWeights(item: CatalogItem, row: ItemRow) {
		weighing = { item, row };
		weightsOpen = true;
	}
</script>

{#each groups as group (group.id)}
	<section aria-labelledby="cat-{group.id}" class="flex flex-col gap-2">
		<h2
			id="cat-{group.id}"
			class="m-0 text-[0.8125rem] font-semibold tracking-[0.06em] text-ink-2 uppercase"
		>
			{group.label}
		</h2>
		<ul class="m-0 list-none rounded-card border border-line bg-surface p-0">
			{#each group.items as item (item.id)}
				{@const row = rowFor(item.id)}
				{@const label = row ? weightsLabel(row.weights as Weights) : ''}
				<li class="flex items-center gap-2 border-b border-line pr-2 last:border-b-0">
					<label class="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 pl-4">
						<input
							type="checkbox"
							class="size-5 shrink-0 accent-brand"
							checked={!!row}
							onchange={(e) => toggle(item, e.currentTarget.checked)}
						/>
						<span class="min-w-0">
							<span class="block font-semibold">{item.name}</span>
							{#if label}<span class="block text-[0.875rem] text-ink-2 tabular-nums">{label}</span
								>{/if}
						</span>
					</label>
					{#if row && item.weight_kind !== 'none'}
						<Button variant="ghost" compact onclick={() => editWeights(item, row)}>
							Edit<span class="sr-only"> weights for {item.name}</span>
						</Button>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/each}

<WeightsSheet bind:open={weightsOpen} item={weighing?.item ?? null} row={weighing?.row ?? null} />
