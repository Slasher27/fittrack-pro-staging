<script lang="ts">
	import { local } from '$lib/data/local.svelte';
	import { deletePhoto, type PhotoRow } from '$lib/data/photos';
	import Button from '$lib/ui/Button.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import PhotoImage from './PhotoImage.svelte';

	type Props = { open: boolean; photo: PhotoRow | null; label: (p: PhotoRow) => string };
	let { open = $bindable(), photo, label }: Props = $props();

	let confirming = $state(false);
	$effect(() => {
		if (open) confirming = false;
	});

	async function remove() {
		if (!photo || !local.db) return;
		await deletePhoto(local.db, photo);
		open = false;
		toast('Photo deleted.');
	}
</script>

<Sheet bind:open title={photo ? label(photo) : 'Photo'}>
	{#if photo}
		<div class="overflow-hidden rounded-control">
			<PhotoImage id={photo.id} alt={label(photo)} class="max-h-[60dvh] object-contain" />
		</div>
		{#if photo.note}<p class="mb-0">{photo.note}</p>{/if}
	{/if}
	{#snippet footer()}
		{#if confirming}
			<p class="mt-0 mb-3">Delete this photo from all your devices? This can’t be undone.</p>
			<div class="flex flex-col gap-2 sm:flex-row-reverse">
				<Button variant="destructive" onclick={remove}>Yes, delete photo</Button>
				<Button variant="secondary" onclick={() => (confirming = false)}>Keep it</Button>
			</div>
		{:else}
			<Button variant="destructive" onclick={() => (confirming = true)}>Delete photo</Button>
		{/if}
	{/snippet}
</Sheet>
