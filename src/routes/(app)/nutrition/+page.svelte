<script lang="ts">
	import { tick } from 'svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth } from '$lib/auth.svelte';
	import WaterCard from '$lib/components/WaterCard.svelte';
	import { local } from '$lib/data/local.svelte';
	import { asFood, logFood, relog, type FoodLogRow, type FoodRow } from '$lib/data/nutrition';
	import { list, timezoneOf } from '$lib/data/repo';
	import type { LocalRow } from '$lib/data/tables';
	import { localDate } from '$lib/domain/dates';
	import {
		amountLabel,
		dayRange,
		eatenAt,
		mealSlotAt,
		recentFoods,
		type MealSlot
	} from '$lib/domain/day';
	import { defaultAmount } from '$lib/domain/food';
	import { currentTarget } from '$lib/domain/targets';
	import { formatInt } from '$lib/format';
	import { net } from '$lib/net.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import IconButton from '$lib/ui/IconButton.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import FoodFormSheet from './FoodFormSheet.svelte';
	import FoodSearch from './FoodSearch.svelte';
	import LogFoodSheet from './LogFoodSheet.svelte';
	import RecipeSheet from './RecipeSheet.svelte';
	import Timeline from './Timeline.svelte';
	import TotalsCard from './TotalsCard.svelte';

	// Nutrition (PRD §4.1, docs/design/Nutrition.html): one day's food, search, custom foods,
	// recents and multi-add, water. Everything works offline. Recipes, barcode and
	// describe-to-log arrive with their own items.
	type Data = {
		tz: string;
		today: string;
		target?: LocalRow<'targets'>;
		logs: FoodLogRow[];
		recent: FoodLogRow[];
		water: LocalRow<'water_logs'>[];
		foods: FoodRow[];
	};
	let data = $state<Data | null>(null);
	let query = $state('');
	let slot = $state<MealSlot>(mealSlotAt(new Date()));
	let logOpen = $state(false);
	let formOpen = $state(false);
	let formName = $state('');
	let picked = $state<FoodRow | null>(null);
	let editing = $state<FoodLogRow | null>(null);
	let recipeOpen = $state(false);
	let recipe = $state<FoodRow | null>(null);

	let loads = 0;
	let loadFailed = $state(false);

	const day = $derived(page.url.searchParams.get('day') ?? data?.today ?? localDate(new Date()));

	$effect(() => {
		void local.version;
		const db = local.db;
		const userId = auth.session?.user.id;
		const date = page.url.searchParams.get('day');
		if (!db || !userId) return;
		const run = ++loads; // a slower, older load must not overwrite a newer day
		(async () => {
			const tz = await timezoneOf(db, userId);
			const today = localDate(new Date(), tz);
			const [start, end] = dayRange(date ?? today, tz);
			const range = IDBKeyRange.bound(start, end, false, true);
			const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
			const [targets, logs, recent, water, foods] = await Promise.all([
				list(db, 'targets'),
				list(db, 'food_logs', { index: 'eaten_at', range }),
				list(db, 'food_logs', { index: 'eaten_at', range: IDBKeyRange.lowerBound(monthAgo) }),
				list(db, 'water_logs', { index: 'at', range }),
				list(db, 'foods')
			]);
			if (run !== loads) return;
			loadFailed = false;
			data = {
				tz,
				today,
				target: currentTarget(targets, date ?? today),
				logs,
				recent,
				water,
				foods
			};
		})().catch(() => run === loads && (loadFailed = true));
	});

	const shift = (n: number) => {
		const [y, m, d] = day.split('-').map(Number);
		return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
	};
	const heading = $derived.by(() => {
		if (!data || day === data.today) return 'Today';
		if (day === shift(0) && shift(1) === data.today) return 'Yesterday';
		const [y, m, d] = day.split('-').map(Number);
		return new Intl.DateTimeFormat('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(y, m - 1, d)));
	});
	const go = (date: string) =>
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- a resolve()d path plus ?day=
		goto(resolve('/nutrition') + (date === data?.today ? '' : `?day=${date}`), {
			replaceState: true,
			keepFocus: true
		});

	const recentIds = $derived(
		[
			...new Set(
				(data?.recent ?? [])
					.toSorted((a, b) => b.eaten_at.localeCompare(a.eaten_at))
					.map((l) => l.food_id)
			)
		].filter((id): id is string => !!id)
	);
	const chips = $derived(recentFoods(data?.recent ?? [], 5));

	function pick(food: FoodRow) {
		editing = null;
		picked = food;
		logOpen = true;
	}

	function edit(l: FoodLogRow) {
		const food = data?.foods.find((f) => f.id === l.food_id);
		if (!food) return toast('That food was deleted, so this entry can’t be edited.', 'warn');
		editing = l;
		picked = food;
		logOpen = true;
	}

	async function startSlot(s: MealSlot) {
		slot = s;
		await tick();
		document.getElementById('food-search')?.focus();
	}

	/** Multi-add: each food with the amount last used for it, else its default amount. */
	async function addMany(foods: FoodRow[]) {
		if (!local.db || !auth.session || !data) return;
		const at = eatenAt(day, slot, new Date(), data.tz);
		for (const food of foods) {
			const last = data.recent
				.filter((l) => l.food_id === food.id)
				.sort((a, b) => b.eaten_at.localeCompare(a.eaten_at))[0];
			if (last) await relog(local.db, last, slot, at);
			else
				await logFood(local.db, auth.session.user.id, food, defaultAmount(asFood(food)), slot, at);
		}
		query = '';
		toast(`Added ${foods.length} ${foods.length === 1 ? 'food' : 'foods'} to ${slot}.`, 'ok');
	}

	async function quickAdd(l: FoodLogRow) {
		if (!local.db || !data) return;
		await relog(local.db, l, slot, eatenAt(day, slot, new Date(), data.tz));
		toast(`Logged ${l.name}, ${amountLabel(l)}.`, 'ok');
	}

	function openRecipe(r: FoodRow | null) {
		logOpen = false;
		recipe = r;
		recipeOpen = true;
	}

	function created(food: FoodRow) {
		query = '';
		pick(food);
	}

	const waterAt = () =>
		day === data?.today ? new Date().toISOString() : eatenAt(day, 'lunch', new Date(), data?.tz);
</script>

<svelte:head><title>Nutrition · FitTrack Pro</title></svelte:head>

<header class="mb-4 flex items-center justify-between gap-2">
	<IconButton icon="back" label="Previous day" onclick={() => go(shift(-1))} />
	<h1 class="m-0 text-center text-title" aria-live="polite">
		<span class="sr-only">Nutrition, </span>{heading}
	</h1>
	<IconButton
		icon="forward"
		label="Next day"
		disabled={!data || day >= data.today}
		onclick={() => go(shift(1))}
	/>
</header>

{#if !net.online}
	<div class="mb-4">
		<Notice>You’re offline. Your library and log work on this device and sync later.</Notice>
	</div>
{/if}

{#if loadFailed && !data}
	<Notice tone="warn" alert
		>We couldn’t open your food log on this device. Reload to try again.</Notice
	>
{:else if !data}
	<p role="status" class="text-ink-2">Loading your food log…</p>
{:else}
	<div class="grid gap-4 lg:grid-cols-[1fr_20rem]">
		<div class="flex min-w-0 flex-col gap-4">
			<TotalsCard logs={data.logs} target={data.target} />
			<FoodSearch
				foods={data.foods}
				{recentIds}
				bind:query
				onpick={pick}
				onadd={addMany}
				oncreate={(name) => ((formName = name), (formOpen = true))}
			/>
			{#if !query.trim()}
				<div>
					<Button variant="secondary" compact onclick={() => openRecipe(null)}>
						<Icon name="plus" size={20} />New recipe
					</Button>
				</div>
				<Timeline logs={data.logs} tz={data.tz} onedit={edit} onlog={startSlot} />
			{/if}
		</div>
		<div class="flex flex-col gap-4">
			{#if chips.length}
				<section aria-labelledby="recent-chips">
					<h2 id="recent-chips" class="mt-0 mb-2 label text-ink-2">Quick add · recent</h2>
					<div class="flex flex-wrap gap-2">
						{#each chips as l (l.id)}
							<button
								type="button"
								class="inline-flex min-h-11 items-center gap-1 rounded-full border border-line-strong bg-surface px-4 text-[0.9375rem] font-medium hover:bg-surface-2"
								aria-label="Add {l.name}, {amountLabel(l)}, {formatInt(
									Number(l.kcal)
								)} kilocalories"
								onclick={() => quickAdd(l)}
							>
								{l.name}
								{amountLabel(l)} · <span class="nums">{formatInt(Number(l.kcal))}</span>
							</button>
						{/each}
					</div>
				</section>
			{/if}
			<WaterCard logs={data.water} targetMl={data.target?.water_ml ?? 3000} at={waterAt} />
		</div>
	</div>

	<LogFoodSheet
		bind:open={logOpen}
		food={picked}
		log={editing}
		{slot}
		date={day}
		tz={data.tz}
		onlogged={() => (query = '')}
		oneditrecipe={openRecipe}
	/>
	<FoodFormSheet bind:open={formOpen} name={formName} onsaved={created} />
	<RecipeSheet
		bind:open={recipeOpen}
		foods={data.foods}
		{recipe}
		onsaved={(f, created) => {
			query = '';
			if (created) pick(f); // a new recipe: log it now; an edit returns to the log
		}}
	/>
{/if}
