<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- hrefs come from callers, already resolve()d */
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes & {
		variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
		compact?: boolean;
		full?: boolean;
		busy?: boolean;
		href?: string;
		children: Snippet;
	};
	let {
		variant = 'primary',
		compact = false,
		full = false,
		busy = false,
		href,
		type = 'button',
		disabled,
		class: klass = '',
		children,
		...rest
	}: Props = $props();

	const variants = {
		primary: 'bg-brand text-on-brand hover:bg-brand-hover',
		secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
		ghost: 'bg-transparent text-brand-ink hover:bg-surface-2 px-3',
		// No danger token exists (DESIGN-SYSTEM §2): destructive uses the warning set plus its label.
		destructive: 'bg-surface text-warn-ink border border-warn hover:bg-warn-tint'
	};
	const cls = $derived(
		[
			'inline-flex items-center justify-center gap-2 rounded-control px-5 font-semibold no-underline',
			'transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60',
			compact ? 'min-h-11 text-[0.9375rem]' : 'min-h-12 text-body',
			full ? 'w-full' : '',
			variants[variant],
			klass
		].join(' ')
	);
</script>

{#if href}
	<a {href} class={cls}>{@render children()}</a>
{:else}
	<button {type} class={cls} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
		{@render children()}
	</button>
{/if}
