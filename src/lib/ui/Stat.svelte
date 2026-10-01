<script lang="ts">
	// Label + value + delta. The delta is always text (e.g. "−0.4 kg this week"), never an arrow alone.
	type Props = {
		label: string;
		value: string;
		unit?: string;
		delta?: string;
		tone?: 'ok' | 'neutral';
	};
	let { label, value, unit, delta, tone = 'neutral' }: Props = $props();
</script>

<div class="flex flex-col gap-1">
	<span class="label text-ink-2">{label}</span>
	<span class="text-[1.75rem] leading-8 font-semibold nums">
		{value}{#if unit}<span class="ml-1 text-body font-medium text-ink-2">{unit}</span>{/if}
	</span>
	{#if delta}
		<span class="text-[0.875rem] font-medium nums {tone === 'ok' ? 'text-ok-ink' : 'text-ink-2'}"
			>{delta}</span
		>
	{/if}
</div>
