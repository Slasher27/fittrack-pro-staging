<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconName } from './Icon.svelte';
	import Card from './Card.svelte';
	import EmptyState from './EmptyState.svelte';

	// Phase 0 placeholder screen: the real screen arrives in the phase named.
	type Props = { title: string; icon: IconName; phase: string; actions?: Snippet };
	let { title, icon, phase, actions }: Props = $props();
</script>

<svelte:head><title>{title} · FitTrack Pro</title></svelte:head>

<header class="mb-6 flex min-h-11 items-center justify-between gap-3">
	<h1 class="m-0 text-display">{title}</h1>
	{#if actions}{@render actions()}{/if}
</header>

<Card>
	<EmptyState {icon} title="Nothing here yet" body="This screen arrives in {phase}." />
</Card>
