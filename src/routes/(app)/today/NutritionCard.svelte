<script lang="ts">
	import { resolve } from '$app/paths';
	import type { LocalRow } from '$lib/data/tables';
	import { dayTotals } from '$lib/domain/day';
	import { formatInt } from '$lib/format';
	import Card from '$lib/ui/Card.svelte';
	import MacroBar from '$lib/ui/MacroBar.svelte';
	import ProgressRing from '$lib/ui/ProgressRing.svelte';

	type Props = { target?: LocalRow<'targets'>; logs: LocalRow<'food_logs'>[] };
	let { target, logs }: Props = $props();

	const eaten = $derived(dayTotals(logs));
	const kcal = $derived(Math.round(eaten.kcal));
	const left = $derived(target ? target.kcal - kcal : 0);
</script>

<Card as="section" class="flex flex-col gap-4" aria-labelledby="nutrition-today">
	<div class="flex items-baseline justify-between gap-3">
		<h2 id="nutrition-today" class="m-0 text-title">Nutrition</h2>
		<a href={resolve('/nutrition')} class="inline-flex min-h-11 items-center font-semibold"
			>Open log</a
		>
	</div>

	{#if target}
		<div class="flex flex-wrap items-center gap-5">
			<ProgressRing
				value={kcal}
				max={target.kcal}
				label="{formatInt(kcal)} of {formatInt(target.kcal)} kcal eaten. {left >= 0
					? `${formatInt(left)} left`
					: `${formatInt(-left)} over`}."
			>
				<span class="block text-title nums">{formatInt(Math.abs(left))}</span>
				<span class="text-[0.8125rem] text-ink-2">kcal {left >= 0 ? 'left' : 'over'}</span>
			</ProgressRing>
			<div class="flex min-w-48 flex-1 flex-col gap-3">
				<MacroBar macro="protein" grams={eaten.protein_g} target={target.protein_g} />
				<MacroBar macro="carbs" grams={eaten.carbs_g} target={target.carbs_g} />
				<MacroBar macro="fat" grams={eaten.fat_g} target={target.fat_g} />
			</div>
		</div>
	{:else}
		<p class="m-0 text-title nums">
			{formatInt(kcal)} kcal <span class="text-body text-ink-2">eaten today</span>
		</p>
		<p class="m-0 text-ink-2">
			<a href={resolve('/settings/targets')}>Set your targets</a> to see what’s left for today.
		</p>
	{/if}
</Card>
