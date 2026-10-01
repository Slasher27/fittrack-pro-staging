<script lang="ts">
	import { local } from '$lib/data/local.svelte';
	import { getBlob } from '$lib/data/photos';
	import Icon from '$lib/ui/Icon.svelte';

	// A photo from this device's image store. Shows "Syncing…" until another device's upload arrives.
	type Props = { id: string; alt: string; class?: string };
	let { id, alt, class: klass = '' }: Props = $props();

	let url = $state<string | null>(null);
	$effect(() => {
		void local.version; // re-check after a sync downloads images
		const db = local.db;
		if (!db) return;
		let made: string | null = null;
		getBlob(db, id).then((b) => {
			if (b) url = made = URL.createObjectURL(b);
		});
		return () => {
			if (made) URL.revokeObjectURL(made);
		};
	});
</script>

{#if url}
	<img src={url} {alt} class="block size-full object-cover {klass}" />
{:else}
	<span
		class="grid size-full place-items-center bg-surface-2 p-2 text-center text-[0.8125rem] text-ink-2 {klass}"
	>
		<span class="flex flex-col items-center gap-1"><Icon name="progress" size={20} />Syncing…</span>
	</span>
{/if}
