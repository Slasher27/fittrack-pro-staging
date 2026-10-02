<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { removeItem, saveCustom, type GymRow, type ItemRow } from '$lib/data/gyms';
	import { local } from '$lib/data/local.svelte';
	import { CAPABILITIES, CAPABILITY_LABELS } from '$lib/domain/capabilities';
	import { validateCustom } from '$lib/domain/equipment';
	import Button from '$lib/ui/Button.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Add or edit custom kit: a name and at least one capability, so exercises can use it.
	type Props = { open: boolean; gym: GymRow; row: ItemRow | null };
	let { open = $bindable(), gym, row }: Props = $props();

	let name = $state('');
	let caps = $state<string[]>([]);
	let errors = $state<{ name?: string; caps?: string; form?: string }>({});
	let busy = $state(false);

	$effect(() => {
		if (!open) return;
		name = row?.custom_name ?? '';
		caps = row ? [...row.capabilities] : [];
		errors = {};
	});

	const toggle = (c: string) =>
		(caps = caps.includes(c) ? caps.filter((x) => x !== c) : [...caps, c]);

	async function save(e: SubmitEvent) {
		e.preventDefault();
		errors = validateCustom(name, caps);
		if (Object.keys(errors).length) return;
		if (!local.db || !auth.session) return;
		busy = true;
		try {
			await saveCustom(local.db, auth.session.user.id, gym.id, {
				id: row?.id,
				name,
				capabilities: caps
			});
			open = false;
			toast(`${name.trim()} saved.`, 'ok');
		} catch {
			errors = { form: 'We couldn’t save this on your device. Try again.' };
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!row || !local.db) return;
		try {
			await removeItem(local.db, row.id);
			open = false;
			toast(`${row.custom_name} removed.`);
		} catch {
			errors = { form: 'We couldn’t remove this on your device. Try again.' };
		}
	}
</script>

<Sheet bind:open title={row ? 'Edit custom equipment' : 'Add custom equipment'}>
	<form id="custom-form" class="flex flex-col gap-4" onsubmit={save} novalidate>
		{#if errors.form}<Notice tone="warn" alert>{errors.form}</Notice>{/if}
		<Field label="Name" bind:value={name} error={errors.name} maxlength={60} />
		<fieldset class="m-0 border-0 p-0" aria-describedby={errors.caps ? 'caps-error' : undefined}>
			<legend class="mb-1 text-[0.875rem] font-semibold">Counts as</legend>
			<p class="mt-0 mb-2 text-[0.875rem] text-ink-2">
				Pick what it can stand in for. Workouts use it for those exercises.
			</p>
			{#if errors.caps}
				<p id="caps-error" class="mt-0 mb-2 text-[0.875rem] font-semibold text-warn-ink">
					{errors.caps}
				</p>
			{/if}
			<div class="flex flex-wrap gap-2">
				{#each CAPABILITIES as c (c)}
					<Chip pressed={caps.includes(c)} onclick={() => toggle(c)}>{CAPABILITY_LABELS[c]}</Chip>
				{/each}
			</div>
		</fieldset>
		{#if row}
			<Button variant="destructive" onclick={remove}>Remove {row.custom_name}</Button>
		{/if}
	</form>
	{#snippet footer()}
		<Button type="submit" form="custom-form" full {busy}>Save</Button>
	{/snippet}
</Sheet>
