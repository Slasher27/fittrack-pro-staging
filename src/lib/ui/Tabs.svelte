<script lang="ts" module>
	import type { IconName } from './Icon.svelte';
	export type NavItem = { href: string; label: string; icon: IconName };
</script>

<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- hrefs come from callers, already resolve()d */
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	// App navigation: bottom tabs on phone, a left rail from 1024 px (DESIGN-SYSTEM §4).
	type Props = { items: NavItem[]; label: string; header?: Snippet; footer?: Snippet };
	let { items, label, header, footer }: Props = $props();

	const isCurrent = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(href + '/');
</script>

<nav
	aria-label={label}
	class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:inset-y-0 lg:right-auto lg:flex lg:w-60 lg:flex-col lg:border-t-0 lg:border-r lg:p-4"
>
	{#if header}<div class="mb-6 hidden lg:block">{@render header()}</div>{/if}
	<ul class="m-0 flex list-none p-0 lg:flex-col lg:gap-1">
		{#each items as item (item.href)}
			{@const current = isCurrent(item.href)}
			<li class="flex-1 lg:flex-none">
				<a
					href={item.href}
					aria-current={current ? 'page' : undefined}
					class="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[0.8125rem] font-semibold no-underline lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-control lg:px-3 lg:text-body {current
						? 'text-brand-ink'
						: 'text-ink-2 hover:text-ink'}"
				>
					<span
						class="grid h-7 w-14 place-items-center rounded-full lg:h-auto lg:w-auto {current
							? 'bg-brand-tint lg:bg-transparent'
							: ''}"
					>
						<Icon name={item.icon} size={22} />
					</span>
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
	{#if footer}<div class="mt-auto hidden lg:block">{@render footer()}</div>{/if}
</nav>
