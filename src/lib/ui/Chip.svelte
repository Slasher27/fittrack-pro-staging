<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	// Chip (static, pressed undefined) or ToggleChip (pressed boolean → aria-pressed).
	type Props = { pressed?: boolean; onclick?: () => void; children: Snippet };
	let { pressed = $bindable(), onclick, children }: Props = $props();

	const base =
		'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[0.9375rem] font-medium';
</script>

{#if pressed === undefined}
	<span class="{base} border-line bg-surface-2 text-ink">{@render children()}</span>
{:else}
	<button
		type="button"
		aria-pressed={pressed}
		class="{base} {pressed
			? 'border-brand bg-brand-tint text-brand-ink'
			: 'border-line-strong bg-surface text-ink hover:bg-surface-2'}"
		onclick={() => (onclick ? onclick() : (pressed = !pressed))}
	>
		{#if pressed}<Icon name="check" size={16} />{/if}
		{@render children()}
	</button>
{/if}
