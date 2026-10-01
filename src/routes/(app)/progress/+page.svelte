<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import type { PhotoRow } from '$lib/data/photos';
	import { get, list } from '$lib/data/repo';
	import type { LocalRow } from '$lib/data/tables';
	import { history, photosByDate } from '$lib/domain/body';
	import { DEFAULT_TIMEZONE, localDate } from '$lib/domain/dates';
	import { changeLabel, weightTrend } from '$lib/domain/weight';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Stat from '$lib/ui/Stat.svelte';
	import MeasureSheet from './MeasureSheet.svelte';
	import PhotoAddSheet from './PhotoAddSheet.svelte';
	import PhotoImage from './PhotoImage.svelte';
	import PhotoViewSheet from './PhotoViewSheet.svelte';

	// Progress (Phase 1: the body entry screens). Phase 5 adds the summary views on top.
	type Row = LocalRow<'body_metrics'>;
	let data = $state<{ today: string; metrics: Row[]; photos: PhotoRow[] } | null>(null);
	let measureOpen = $state(false);
	let entry = $state<Row | null>(null);
	let addOpen = $state(false);
	let viewOpen = $state(false);
	let viewing = $state<PhotoRow | null>(null);

	$effect(() => {
		void local.version;
		const db = local.db;
		const userId = auth.session?.user.id;
		if (!db || !userId) return;
		(async () => {
			const tz = (await get(db, 'profiles', userId))?.timezone || DEFAULT_TIMEZONE;
			const [metrics, photos] = await Promise.all([list(db, 'body_metrics'), list(db, 'photos')]);
			data = { today: localDate(new Date(), tz), metrics, photos };
		})();
	});

	const entries = $derived(data ? history(data.metrics) : []);
	const trend = $derived(data ? weightTrend(data.metrics, data.today) : null);
	const groups = $derived(data ? photosByDate(data.photos) : []);
	const fmtDate = (
		d: string,
		opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
	) => {
		const [y, m, day] = d.split('-').map(Number);
		return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(
			new Date(Date.UTC(y, m - 1, day))
		);
	};
	const measures = (r: Row) =>
		(
			[
				['Waist', r.waist_cm],
				['Chest', r.chest_cm],
				['Arm', r.arm_cm],
				['Thigh', r.thigh_cm]
			] as const
		)
			.filter(([, v]) => v != null)
			.map(([k, v]) => `${k} ${v}`)
			.join(' · ');
	const photoLabel = (p: PhotoRow) =>
		`${p.pose ?? 'Progress'} photo, ${fmtDate(p.taken_on, { day: 'numeric', month: 'long', year: 'numeric' })}`;

	function openEntry(r: Row | null) {
		entry = r;
		measureOpen = true;
	}
</script>

<svelte:head><title>Progress · FitTrack Pro</title></svelte:head>

<h1 class="mt-0 mb-6 text-display">Progress</h1>

{#if !data}
	<p role="status" class="text-ink-2">Loading your progress…</p>
{:else}
	<div class="flex flex-col gap-4">
		<Card as="section" class="flex flex-col gap-4" aria-labelledby="measurements">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 id="measurements" class="m-0 text-title">Weight & measurements</h2>
				<Button variant="secondary" compact onclick={() => openEntry(null)}>
					<Icon name="plus" size={20} />Add entry
				</Button>
			</div>
			{#if trend}
				<Stat
					label="Weight · 7-day average"
					value={trend.average.toFixed(1)}
					unit="kg"
					delta={trend.change === null ? undefined : changeLabel(trend.change)}
				/>
			{/if}
			{#if entries.length}
				<table class="w-full border-collapse text-left">
					<caption class="sr-only">Your entries, newest first</caption>
					<thead>
						<tr class="border-b border-line text-[0.875rem] text-ink-2">
							<th scope="col" class="py-2 pr-3 font-semibold">Date</th>
							<th scope="col" class="py-2 pr-3 font-semibold">Weight</th>
							<th scope="col" class="py-2 font-semibold">Measurements (cm)</th>
							<th scope="col" class="w-11 py-2"><span class="sr-only">Edit</span></th>
						</tr>
					</thead>
					<tbody>
						{#each entries.slice(0, 30) as r (r.id)}
							<tr class="border-b border-line last:border-b-0">
								<th scope="row" class="py-2 pr-3 font-semibold whitespace-nowrap nums"
									>{fmtDate(r.date)}</th
								>
								<td class="py-2 pr-3 whitespace-nowrap nums"
									>{r.weight_kg != null ? `${r.weight_kg} kg` : '–'}</td
								>
								<td class="py-2 text-[0.9375rem] text-ink-2 nums">
									{measures(r) || '–'}{#if r.notes}<span class="block text-ink-2 italic"
											>{r.notes}</span
										>{/if}
								</td>
								<td class="py-1">
									<button
										type="button"
										class="grid size-11 place-items-center rounded-control hover:bg-surface-2"
										aria-label="Edit entry for {fmtDate(r.date, { day: 'numeric', month: 'long' })}"
										onclick={() => openEntry(r)}
									>
										<Icon name="forward" size={20} />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<EmptyState
					icon="progress"
					headingLevel={3}
					title="No entries yet"
					body="Log your weight and measurements to see your trend here."
				/>
			{/if}
		</Card>

		<Card as="section" class="flex flex-col gap-4" aria-labelledby="photos">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 id="photos" class="m-0 text-title">Progress photos</h2>
				<Button variant="secondary" compact onclick={() => (addOpen = true)}>
					<Icon name="plus" size={20} />Add photo
				</Button>
			</div>
			<p class="m-0 text-[0.9375rem] text-ink-2">Private: only you can see your photos.</p>
			{#if groups.length}
				{#each groups as [date, photos] (date)}
					<section aria-labelledby="photos-{date}">
						<h3 id="photos-{date}" class="mt-0 mb-2 label text-ink-2">
							{fmtDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}
						</h3>
						<ul class="m-0 grid list-none grid-cols-3 gap-2 p-0 sm:grid-cols-4">
							{#each photos as p (p.id)}
								<li>
									<button
										type="button"
										class="block aspect-[3/4] w-full overflow-hidden rounded-control border border-line"
										aria-label="View {photoLabel(p)}"
										onclick={() => ((viewing = p), (viewOpen = true))}
									>
										<PhotoImage id={p.id} alt="" />
									</button>
									<span class="mt-1 block text-[0.8125rem] text-ink-2">{p.pose ?? ''}</span>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			{:else}
				<EmptyState
					icon="progress"
					headingLevel={3}
					title="No photos yet"
					body="Photos taken in the same light and pose show change that the scale misses."
				/>
			{/if}
		</Card>
	</div>

	<MeasureSheet bind:open={measureOpen} {entry} entries={data.metrics} today={data.today} />
	<PhotoAddSheet bind:open={addOpen} today={data.today} />
	<PhotoViewSheet bind:open={viewOpen} photo={viewing} label={photoLabel} />
{/if}
