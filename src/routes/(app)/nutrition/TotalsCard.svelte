<script lang="ts">
	import { resolve } from '$app/paths';
	import type { FoodLogRow } from '$lib/data/nutrition';
	import type { LocalRow } from '$lib/data/tables';
	import { dayTotals } from '$lib/domain/day';
	import { formatInt } from '$lib/format';
	import Card from '$lib/ui/Card.svelte';

	type Props = { logs: FoodLogRow[]; target?: LocalRow<'targets'> };
	let { logs, target }: Props = $props();

	const t = $derived(dayTotals(logs));
	const kcal = $derived(Math.round(t.kcal));
	const left = $derived(target ? target.kcal - kcal : 0);
	const pct = $derived(target ? Math.min((kcal / target.kcal) * 100, 100) : 0);
	const macros = $derived(
		target
			? ([
					['Protein', 'bg-protein', target.protein_g - t.protein_g],
					['Carbs', 'bg-carbs', target.carbs_g - t.carbs_g],
					['Fat', 'bg-fat', target.fat_g - t.fat_g]
				] as const)
			: []
	);
</script>

<Card as="section" class="flex flex-col gap-3" aria-label="Daily totals">
	{#if target}
		<div class="flex flex-wrap items-baseline justify-between gap-2">
			<p class="m-0 nums">
				<span class="text-[1.75rem] leading-8 font-semibold">{formatInt(Math.abs(left))}</span>
				<span class="text-ink-2"> kcal {left >= 0 ? 'left' : 'over'}</span>
			</p>
			<p class="m-0 text-ink-2 nums">{formatInt(kcal)} of {formatInt(target.kcal)}</p>
		</div>
		<div
			class="h-2 overflow-hidden rounded-full bg-surface-2"
			role="meter"
			aria-label="Calories"
			aria-valuemin={0}
			aria-valuemax={target.kcal}
			aria-valuenow={kcal}
			aria-valuetext="{formatInt(kcal)} of {formatInt(target.kcal)} kcal"
		>
			<div class="h-full rounded-full bg-brand" style:width="{pct}%"></div>
		</div>
		<ul class="m-0 grid list-none grid-cols-3 gap-2 p-0">
			{#each macros as [name, dot, g] (name)}
				<li class="flex flex-col">
					<span class="flex items-center gap-1.5 font-semibold">
						<span class="size-2.5 rounded-full {dot}" aria-hidden="true"></span>{name}
					</span>
					<span class="text-[0.9375rem] text-ink-2 nums">
						{formatInt(Math.abs(g))} g {g >= 0 ? 'left' : 'over'}
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="m-0 nums">
			<span class="text-[1.75rem] leading-8 font-semibold">{formatInt(kcal)}</span>
			<span class="text-ink-2"> kcal eaten</span>
		</p>
		<p class="m-0 text-ink-2">
			<a href={resolve('/settings/targets')}>Set your targets</a> to see what’s left.
		</p>
	{/if}
</Card>
