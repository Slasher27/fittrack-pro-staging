<script lang="ts">
	// One macro: label + "eaten / target g" in text, and a bar in its data colour (never colour alone).
	type Macro = 'protein' | 'carbs' | 'fat';
	type Props = { macro: Macro; grams: number; target: number };
	let { macro, grams, target }: Props = $props();

	const names: Record<Macro, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };
	const fills: Record<Macro, string> = { protein: 'bg-protein', carbs: 'bg-carbs', fat: 'bg-fat' };
	const pct = $derived(target > 0 ? Math.min((grams / target) * 100, 100) : 0);
</script>

<div class="flex flex-col gap-1.5">
	<div class="flex items-baseline justify-between gap-2">
		<span class="text-[0.9375rem] font-semibold">{names[macro]}</span>
		<span class="text-[0.9375rem] text-ink-2 nums">{Math.round(grams)} / {target} g</span>
	</div>
	<div
		class="h-2 overflow-hidden rounded-full bg-surface-2"
		role="meter"
		aria-label={names[macro]}
		aria-valuemin={0}
		aria-valuemax={target}
		aria-valuenow={Math.round(grams)}
		aria-valuetext="{Math.round(grams)} of {target} grams"
	>
		<div class="h-full rounded-full {fills[macro]}" style:width="{pct}%"></div>
	</div>
</div>
