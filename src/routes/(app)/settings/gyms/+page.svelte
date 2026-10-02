<script lang="ts">
	import { resolve } from '$app/paths';
	import { auth } from '$lib/auth.svelte';
	import {
		ensureDefaultGym,
		hasSynced,
		loadGyms,
		updateGym,
		type GymRow,
		type ItemRow
	} from '$lib/data/gyms';
	import { local } from '$lib/data/local.svelte';
	import { GYM_KINDS } from '$lib/domain/equipment';
	import { net } from '$lib/net.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import SegmentedControl from '$lib/ui/SegmentedControl.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import CustomKit from './CustomKit.svelte';
	import EquipmentList from './EquipmentList.svelte';
	import GymSheet from './GymSheet.svelte';

	// Gym profiles (PRD §4.1, docs/design/Equipment.html with DESIGN-SYSTEM §7.1): several named
	// locations, each with catalogue and custom equipment. Every change saves at once (D-040).
	let data = $state<{ gyms: GymRow[]; items: ItemRow[]; synced: boolean } | null>(null);
	let loadFailed = $state(false);
	let selected = $state('');
	let sheetOpen = $state(false);
	let editing = $state<GymRow | null>(null);

	$effect(() => {
		void local.version;
		const db = local.db;
		const userId = auth.session?.user.id;
		if (!db || !userId) return;
		(async () => {
			await ensureDefaultGym(db, userId); // only after the first pull (ARCHITECTURE §5)
			const [loaded, synced] = await Promise.all([loadGyms(db), hasSynced(db)]);
			data = { ...loaded, synced };
			loadFailed = false;
			if (!loaded.gyms.some((g) => g.id === selected)) selected = loaded.gyms[0]?.id ?? '';
		})().catch(() => (loadFailed = true));
	});

	const gym = $derived(data?.gyms.find((g) => g.id === selected));
	const items = $derived(data && gym ? data.items.filter((i) => i.gym_profile_id === gym.id) : []);
	const kindLabel = (k: string) => GYM_KINDS.find((x) => x.value === k)?.label ?? k;

	async function setFull(on: boolean) {
		if (!local.db || !gym) return;
		try {
			await updateGym(local.db, gym.id, { assume_full: on });
		} catch {
			toast('We couldn’t save that on this device. Try again.', 'warn');
			local.version++; // re-read, so the switch shows what is actually saved
		}
	}

	// Segments fit a few short names at 390 px; otherwise a select, so nothing overflows.
	const compact = $derived(
		!!data && data.gyms.length <= 3 && data.gyms.every((g) => g.name.length <= 12)
	);

	function openSheet(g: GymRow | null) {
		editing = g;
		sheetOpen = true;
	}
</script>

<svelte:head><title>Gym profiles · FitTrack Pro</title></svelte:head>

<a
	href={resolve('/settings')}
	class="mb-2 -ml-2 inline-flex min-h-11 items-center gap-1 pr-2 font-semibold no-underline"
>
	<Icon name="back" size={20} />Settings
</a>
<h1 class="mt-0 mb-2 text-display">Gym profiles</h1>
<p class="mt-0 mb-6 text-ink-2">
	Where you train and what’s there. Workouts only use equipment the gym has.
</p>

{#if !net.online}
	<div class="mb-4">
		<Notice>You’re offline. Changes are saved on this device and sync later.</Notice>
	</div>
{/if}

{#if loadFailed && !data}
	<Notice tone="warn" alert>We couldn’t open your gyms on this device. Reload to try again.</Notice>
{:else if !data}
	<p role="status" class="text-ink-2">Loading your gyms…</p>
{:else if !data.gyms.length}
	{#if data.synced}
		<p role="status" class="text-ink-2">Setting up your home gym…</p>
	{:else}
		<Notice>Your gyms load the first time you’re online. Connect to set up your equipment.</Notice>
	{/if}
{:else}
	<div class="flex flex-col gap-4">
		<div class="flex items-end gap-2">
			<div class="min-w-0 flex-1">
				{#if compact}
					<SegmentedControl
						legend="Gym"
						bind:value={selected}
						options={data.gyms.map((g) => ({ value: g.id, label: g.name }))}
					/>
				{:else}
					<div class="flex flex-col gap-1.5">
						<label for="gym-select" class="text-[0.875rem] font-semibold">Gym</label>
						<select
							id="gym-select"
							bind:value={selected}
							class="min-h-12 w-full min-w-0 truncate rounded-control border border-line-strong bg-surface px-3 text-ink"
						>
							{#each data.gyms as g (g.id)}<option value={g.id}>{g.name}</option>{/each}
						</select>
					</div>
				{/if}
			</div>
			<Button variant="secondary" class="shrink-0" onclick={() => openSheet(null)}>
				<Icon name="plus" size={18} />Add gym
			</Button>
		</div>

		{#if gym}
			<Card as="section" class="flex flex-col gap-4" aria-labelledby="gym-name">
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0">
						<h2 id="gym-name" class="m-0 truncate text-title">{gym.name}</h2>
						<p class="m-0 text-ink-2">
							{kindLabel(gym.kind)}{gym.is_default ? ' · Default gym' : ''}
						</p>
					</div>
					<Button variant="ghost" compact onclick={() => openSheet(gym)}>
						Edit<span class="sr-only"> {gym.name}</span>
					</Button>
				</div>
				<div>
					<label class="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
						<input
							type="checkbox"
							role="switch"
							class="size-5 shrink-0 accent-brand"
							checked={gym.assume_full}
							aria-describedby="full-hint"
							onchange={(e) => setFull(e.currentTarget.checked)}
						/>
						Full equipment
					</label>
					<p id="full-hint" class="m-0 pl-8 text-[0.875rem] text-ink-2">
						A fully equipped gym: every exercise is available here.
					</p>
				</div>
			</Card>

			{#if !gym.assume_full}
				<EquipmentList {gym} {items} />
				<CustomKit {gym} {items} />
			{/if}
		{/if}

		<Button href={resolve('/settings')} full>Done</Button>
	</div>
{/if}

<GymSheet
	bind:open={sheetOpen}
	gym={editing}
	gyms={data?.gyms ?? []}
	items={data?.items ?? []}
	onadded={(id) => (selected = id)}
/>
