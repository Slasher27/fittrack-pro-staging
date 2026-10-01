<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from './Icon.svelte';

	type Props = {
		icon?: IconName;
		title: string;
		body?: string;
		headingLevel?: 2 | 3;
		action?: Snippet;
	};
	let { icon = 'info', title, body, headingLevel = 2, action }: Props = $props();
</script>

<div class="flex flex-col items-center gap-3 px-4 py-10 text-center">
	<span class="grid size-14 place-items-center rounded-full bg-surface-2 text-ink-2">
		<Icon name={icon} size={28} />
	</span>
	<svelte:element this={`h${headingLevel}`} class="m-0 text-title">{title}</svelte:element>
	{#if body}<p class="m-0 max-w-sm text-ink-2">{body}</p>{/if}
	{#if action}<div class="mt-2">{@render action()}</div>{/if}
</div>
