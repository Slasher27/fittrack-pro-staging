<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- hrefs come from callers, already resolve()d */
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Icon, { type IconName } from './Icon.svelte';

	// `label` is required: icon-only controls need an accessible name (DESIGN-SYSTEM §5).
	type Props = HTMLButtonAttributes & { icon: IconName; label: string; href?: string };
	let { icon, label, href, type = 'button', class: klass = '', ...rest }: Props = $props();
	const cls = $derived(
		`inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink hover:bg-surface-2 ${klass}`
	);
</script>

{#if href}
	<a {href} class={cls} aria-label={label} title={label}><Icon name={icon} /></a>
{:else}
	<button {type} class={cls} aria-label={label} title={label} {...rest}><Icon name={icon} /></button
	>
{/if}
