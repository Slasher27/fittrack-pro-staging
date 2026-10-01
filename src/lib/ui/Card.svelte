<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	// Hairline border, no shadow (A · Quiet). `as` picks a semantic element.
	type Props = HTMLAttributes<HTMLElement> & {
		as?: 'div' | 'section' | 'article' | 'li';
		children: Snippet;
	};
	let { as = 'div', class: klass = '', children, ...rest }: Props = $props();
</script>

<svelte:element this={as} class="rounded-card border border-line bg-surface p-5 {klass}" {...rest}>
	{@render children()}
</svelte:element>
