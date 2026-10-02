<script lang="ts">
	import type { GymRow, ItemRow } from '$lib/data/gyms';
	import { CAPABILITY_LABELS, isCapability } from '$lib/domain/capabilities';
	import Button from '$lib/ui/Button.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import CustomSheet from './CustomSheet.svelte';

	// Kit that isn't in the catalogue, mapped to the capabilities it counts as (D-035).
	type Props = { gym: GymRow; items: ItemRow[] };
	let { gym, items }: Props = $props();

	let open = $state(false);
	let editing = $state<ItemRow | null>(null);
	const custom = $derived(items.filter((i) => !i.catalog_id));
	const label = (c: string) => (isCapability(c) ? CAPABILITY_LABELS[c] : c);

	function edit(row: ItemRow | null) {
		editing = row;
		open = true;
	}
</script>

<section aria-labelledby="custom-kit" class="flex flex-col gap-2">
	<h2
		id="custom-kit"
		class="m-0 text-[0.8125rem] font-semibold tracking-[0.06em] text-ink-2 uppercase"
	>
		Your custom kit
	</h2>
	{#if custom.length}
		<ul class="m-0 list-none rounded-card border border-line bg-surface p-0">
			{#each custom as row (row.id)}
				<li class="flex items-start gap-2 border-b border-line py-3 pr-2 pl-4 last:border-b-0">
					<div class="min-w-0 flex-1">
						<p class="m-0 font-semibold">{row.custom_name}</p>
						<p class="m-0 mt-1 flex flex-wrap items-center gap-1.5 text-[0.875rem]">
							<span class="text-ink-2">Counts as</span>
							{#each row.capabilities as c (c)}<Chip>{label(c)}</Chip>{/each}
						</p>
					</div>
					<Button variant="ghost" compact onclick={() => edit(row)}>
						Edit<span class="sr-only"> {row.custom_name}</span>
					</Button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="m-0 text-ink-2">Anything not in the list, like a sandbag or a homemade rig.</p>
	{/if}
	<div>
		<Button variant="secondary" onclick={() => edit(null)}>
			<Icon name="plus" size={18} />Add custom equipment
		</Button>
	</div>
</section>

<CustomSheet bind:open {gym} row={editing} />
