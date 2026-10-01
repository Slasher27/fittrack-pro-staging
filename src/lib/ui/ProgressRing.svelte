<script lang="ts">
	import type { Snippet } from 'svelte';

	// A ring for one value against a target. `label` is the spoken summary; the centre shows the number.
	type Props = { value: number; max: number; label: string; size?: number; children?: Snippet };
	let { value, max, label, size = 120, children }: Props = $props();

	const stroke = 10;
	const r = $derived((size - stroke) / 2);
	const c = $derived(2 * Math.PI * r);
	const pct = $derived(max > 0 ? Math.min(value / max, 1) : 0);
</script>

<div
	class="relative inline-grid place-items-center"
	style:width="{size}px"
	style:height="{size}px"
	role="img"
	aria-label={label}
>
	<svg width={size} height={size} viewBox="0 0 {size} {size}" class="-rotate-90" aria-hidden="true">
		<circle
			cx={size / 2}
			cy={size / 2}
			{r}
			fill="none"
			stroke="var(--surface-2)"
			stroke-width={stroke}
		/>
		<circle
			cx={size / 2}
			cy={size / 2}
			{r}
			fill="none"
			stroke="var(--brand)"
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray={c}
			stroke-dashoffset={c * (1 - pct)}
		/>
	</svg>
	{#if children}<div class="absolute text-center" aria-hidden="true">{@render children()}</div>{/if}
</div>
