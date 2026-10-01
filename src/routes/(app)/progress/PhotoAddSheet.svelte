<script lang="ts">
	import { untrack } from 'svelte';
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import { addPhoto, compressImage } from '$lib/data/photos';
	import { POSES, type Pose } from '$lib/domain/body';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Add a progress photo: camera or library (the phone offers both), angle, date, note.
	type Props = { open: boolean; today: string };
	let { open = $bindable(), today }: Props = $props();

	let file = $state<File | null>(null);
	let preview = $state<string | null>(null);
	let pose = $state<Pose>('Front');
	let date = $state('');
	let note = $state('');
	let error = $state('');
	let busy = $state(false);
	// Re-create the form on each open: a file input keeps its old file otherwise, while our state resets.
	let session = $state(0);

	// Reset on each open. untrack: the reset depends on `open` only, not on what it writes.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			session++;
			file = null;
			pose = 'Front';
			date = today;
			note = error = '';
		});
	});
	$effect(() => {
		const url = file ? URL.createObjectURL(file) : null;
		preview = url;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (!file) return (error = 'Choose or take a photo.');
		if (!local.db || !auth.session) return;
		busy = true;
		try {
			const blob = await compressImage(file);
			await addPhoto(local.db, auth.session.user.id, { blob, takenOn: date || today, pose, note });
			open = false;
			toast('Photo saved. Only you can see it.', 'ok');
		} catch {
			error = 'We couldn’t read that image. Try another photo.';
		} finally {
			busy = false;
		}
	}
</script>

<Sheet bind:open title="Add photo">
	{#key session}
		<form id="photo-form" class="flex flex-col gap-4" onsubmit={save} novalidate>
			<div class="flex flex-col gap-1.5">
				<label for="photo-file" class="text-[0.875rem] font-semibold">Photo</label>
				<input
					id="photo-file"
					type="file"
					accept="image/*"
					aria-invalid={error && !file ? true : undefined}
					aria-describedby={error ? 'photo-error' : undefined}
					class="min-h-12 rounded-control border border-line-strong bg-surface p-2 text-body file:mr-3 file:min-h-10 file:rounded-[10px] file:border-0 file:bg-surface-2 file:px-4 file:font-semibold file:text-ink"
					onchange={(e) => ((file = e.currentTarget.files?.[0] ?? null), (error = ''))}
				/>
				{#if error}
					<p
						id="photo-error"
						class="m-0 flex items-start gap-1.5 text-[0.875rem] font-medium text-warn-ink"
					>
						<Icon name="warning" size={18} class="mt-px shrink-0" />{error}
					</p>
				{/if}
			</div>
			{#if preview}
				<img
					src={preview}
					alt="Preview of your selection"
					class="max-h-64 w-auto self-start rounded-control"
				/>
			{/if}
			<fieldset class="m-0 border-0 p-0">
				<legend class="mb-2 text-[0.875rem] font-semibold">Angle</legend>
				<div class="flex flex-wrap gap-x-5">
					{#each POSES as p (p)}
						<label class="flex min-h-11 cursor-pointer items-center gap-2">
							<input
								type="radio"
								name="pose"
								value={p}
								bind:group={pose}
								class="size-5 accent-brand"
							/>{p}
						</label>
					{/each}
				</div>
			</fieldset>
			<Field label="Date" type="date" max={today} bind:value={date} />
			<Field label="Note (optional)" placeholder="e.g. morning, fasted" bind:value={note} />
		</form>
	{/key}
	{#snippet footer()}
		<Button type="submit" form="photo-form" {busy} full>{busy ? 'Saving…' : 'Save photo'}</Button>
	{/snippet}
</Sheet>
