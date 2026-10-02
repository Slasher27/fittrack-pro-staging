<script lang="ts">
	import { resolve } from '$app/paths';
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import { get, list } from '$lib/data/repo';
	import type { LocalRow } from '$lib/data/tables';
	import { DEFAULT_TIMEZONE, localDate } from '$lib/domain/dates';
	import { dayRange, greeting } from '$lib/domain/day';
	import { currentTarget } from '$lib/domain/targets';
	import { net } from '$lib/net.svelte';
	import WaterCard from '$lib/components/WaterCard.svelte';
	import Avatar from '$lib/ui/Avatar.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import NutritionCard from './NutritionCard.svelte';
	import QuickLog from './QuickLog.svelte';
	import WeightCard from './WeightCard.svelte';

	// Today (PRD §4.1, docs/design/Today.html): what to do now. Phase 1 shows nutrition, water,
	// weight and quick log; the coach note and today's workout arrive with Phases 2 and 4.
	type Day = {
		tz: string;
		today: string;
		name: string;
		target?: LocalRow<'targets'>;
		foodToday: LocalRow<'food_logs'>[];
		foodRecent: LocalRow<'food_logs'>[];
		water: LocalRow<'water_logs'>[];
		metrics: LocalRow<'body_metrics'>[];
	};
	let day = $state<Day | null>(null);
	let loadFailed = $state(false);
	let now = $state(new Date());

	$effect(() => {
		const id = setInterval(() => (now = new Date()), 60_000); // greeting and midnight roll-over
		return () => clearInterval(id);
	});

	$effect(() => {
		void local.version;
		const db = local.db;
		const userId = auth.session?.user.id;
		const at = now;
		if (!db || !userId) return;
		(async () => {
			const profile = await get(db, 'profiles', userId);
			const tz = profile?.timezone || DEFAULT_TIMEZONE;
			const today = localDate(at, tz);
			const [start, end] = dayRange(today, tz);
			const monthAgo = new Date(at.getTime() - 30 * 86_400_000).toISOString();
			const [targets, foodToday, foodRecent, water, metrics] = await Promise.all([
				list(db, 'targets'),
				list(db, 'food_logs', {
					index: 'eaten_at',
					range: IDBKeyRange.bound(start, end, false, true)
				}),
				list(db, 'food_logs', { index: 'eaten_at', range: IDBKeyRange.lowerBound(monthAgo) }),
				list(db, 'water_logs', { index: 'at', range: IDBKeyRange.bound(start, end, false, true) }),
				list(db, 'body_metrics')
			]);
			day = {
				tz,
				today,
				name: profile?.display_name?.split(/\s+/)[0] ?? '',
				target: currentTarget(targets, today),
				foodToday,
				foodRecent,
				water,
				metrics
			};
			loadFailed = false;
		})().catch(() => (loadFailed = true));
	});

	const dateLabel = $derived(
		new Intl.DateTimeFormat('en-GB', {
			timeZone: day?.tz ?? DEFAULT_TIMEZONE,
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(now)
	);
</script>

<svelte:head><title>Today · FitTrack Pro</title></svelte:head>

<header class="mb-6 flex items-start justify-between gap-3">
	<div class="flex flex-col gap-1">
		<p class="m-0 label text-ink-2">{dateLabel}</p>
		<h1 class="m-0 text-display">
			{greeting(now, day?.tz)}{day?.name ? `, ${day.name}` : ''}
		</h1>
	</div>
	<a
		href={resolve('/settings')}
		aria-label="Profile and settings"
		class="grid size-11 shrink-0 place-items-center rounded-full no-underline"
	>
		<Avatar name={auth.session?.user.user_metadata.display_name ?? '?'} decorative />
	</a>
</header>

{#if !net.online}
	<div class="mb-4">
		<Notice
			>You’re offline. What you log is saved on this device and syncs when you’re back online.</Notice
		>
	</div>
{/if}

{#if loadFailed && !day}
	<Notice tone="warn" alert
		>We couldn’t open today’s log on this device. Reload to try again.</Notice
	>
{:else if !day}
	<p role="status" class="text-ink-2">Loading today…</p>
{:else}
	<div class="grid gap-4 lg:grid-cols-2">
		<NutritionCard target={day.target} logs={day.foodToday} />
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
			<WaterCard logs={day.water} targetMl={day.target?.water_ml ?? 3000} />
			<WeightCard metrics={day.metrics} today={day.today} />
		</div>
		<div class="lg:col-span-2">
			<QuickLog recent={day.foodRecent} tz={day.tz} />
		</div>
	</div>
{/if}
