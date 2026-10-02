<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import {
		addGym,
		deleteGym,
		makeDefault,
		updateGym,
		type GymRow,
		type ItemRow
	} from '$lib/data/gyms';
	import { local } from '$lib/data/local.svelte';
	import { GYM_KINDS, validateGymName, type GymKind } from '$lib/domain/equipment';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Add a gym, or rename / make default / delete one. Deleting asks first.
	type Props = {
		open: boolean;
		gym: GymRow | null;
		gyms: GymRow[];
		items: ItemRow[];
		onadded: (id: string) => void;
	};
	let { open = $bindable(), gym, gyms, items, onadded }: Props = $props();

	let name = $state('');
	let kind = $state<GymKind>('home');
	let nameError = $state('');
	let failed = $state(false);
	let confirming = $state(false);
	let busy = $state(false);
	const kindId = $props.id();

	$effect(() => {
		if (!open) return;
		name = gym?.name ?? '';
		kind = (gym?.kind as GymKind) ?? 'home';
		nameError = '';
		failed = false;
		confirming = false;
	});

	async function run(action: () => Promise<unknown>, message: string) {
		busy = true;
		failed = false;
		try {
			await action();
			open = false;
			toast(message, 'ok');
		} catch {
			failed = true;
		} finally {
			busy = false;
		}
	}

	function save(e: SubmitEvent) {
		e.preventDefault();
		nameError = validateGymName(name) ?? '';
		const db = local.db;
		const userId = auth.session?.user.id;
		if (nameError || !db || !userId) return;
		if (gym) {
			const id = gym.id;
			return run(() => updateGym(db, id, { name: name.trim(), kind }), 'Gym saved.');
		}
		return run(async () => {
			const g = await addGym(db, userId, { name, kind });
			onadded(g.id);
		}, `${name.trim()} added.`);
	}
</script>

<Sheet bind:open title={gym ? 'Edit gym' : 'Add a gym'}>
	<form id="gym-form" class="flex flex-col gap-4" onsubmit={save} novalidate>
		{#if failed}
			<Notice tone="warn" alert>We couldn’t save this on your device. Try again.</Notice>
		{/if}
		<Field label="Name" bind:value={name} error={nameError} maxlength={60} />
		<div class="flex flex-col gap-1.5">
			<label for={kindId} class="text-[0.875rem] font-semibold">Type</label>
			<select
				id={kindId}
				bind:value={kind}
				class="min-h-12 rounded-control border border-line-strong bg-surface px-3 text-ink"
			>
				{#each GYM_KINDS as k (k.value)}<option value={k.value}>{k.label}</option>{/each}
			</select>
			{#if !gym}
				<p class="m-0 text-[0.875rem] text-ink-2">A commercial gym starts with full equipment.</p>
			{/if}
		</div>

		{#if gym && local.db}
			{@const db = local.db}
			{@const current = gym}
			<div class="flex flex-col gap-2 border-t border-line pt-4">
				{#if !current.is_default}
					<Button
						variant="secondary"
						onclick={() =>
							run(() => makeDefault(db, gyms, current.id), `${current.name} is your default gym.`)}
					>
						Make this my default gym
					</Button>
				{/if}
				{#if gyms.length > 1}
					{#if confirming}
						<Notice tone="warn">
							Delete {current.name} and its equipment? This can’t be undone.
						</Notice>
						<Button
							variant="destructive"
							{busy}
							onclick={() =>
								run(() => deleteGym(db, gyms, items, current), `${current.name} deleted.`)}
						>
							Yes, delete {current.name}
						</Button>
						<Button variant="ghost" onclick={() => (confirming = false)}>Keep it</Button>
					{:else}
						<Button variant="destructive" onclick={() => (confirming = true)}>
							Delete this gym
						</Button>
					{/if}
				{/if}
			</div>
		{/if}
	</form>
	{#snippet footer()}
		<Button type="submit" form="gym-form" full {busy}>{gym ? 'Save' : 'Add gym'}</Button>
	{/snippet}
</Sheet>
