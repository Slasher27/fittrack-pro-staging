<script lang="ts">
	import type { FoodLogRow } from '$lib/data/nutrition';
	import { amountLabel, dayTotals, type MealSlot } from '$lib/domain/day';
	import { formatInt } from '$lib/format';
	import Card from '$lib/ui/Card.svelte';
	import Icon from '$lib/ui/Icon.svelte';

	// The day's food, grouped by meal. Tap an entry to edit it; an empty meal offers "Log …".
	type Props = {
		logs: FoodLogRow[];
		tz: string;
		onedit: (log: FoodLogRow) => void;
		onlog: (slot: MealSlot) => void;
	};
	let { logs, tz, onedit, onlog }: Props = $props();

	const SLOTS: { slot: MealSlot; label: string }[] = [
		{ slot: 'breakfast', label: 'Breakfast' },
		{ slot: 'lunch', label: 'Lunch' },
		{ slot: 'snack', label: 'Snacks' },
		{ slot: 'dinner', label: 'Dinner' }
	];
	const time = $derived(
		new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
	);
	const bySlot = (slot: MealSlot) =>
		logs
			.filter((l) => (l.meal_slot ?? 'snack') === slot)
			.sort((a, b) => a.eaten_at.localeCompare(b.eaten_at));
</script>

<Card as="section" class="flex flex-col gap-1 px-0 pb-2" aria-labelledby="timeline">
	<h2 id="timeline" class="mx-5 mt-0 mb-2 text-title">Food timeline</h2>
	{#each SLOTS as { slot, label } (slot)}
		{@const items = bySlot(slot)}
		<section aria-labelledby="slot-{slot}" class="border-t border-line first-of-type:border-t-0">
			<div class="flex items-baseline justify-between px-5 pt-3 pb-1">
				<h3 id="slot-{slot}" class="m-0 label text-ink-2">{label}</h3>
				{#if items.length}
					<span class="text-[0.875rem] text-ink-2 nums"
						>{formatInt(dayTotals(items).kcal)} kcal</span
					>
				{/if}
			</div>
			{#if items.length}
				<ul class="m-0 list-none p-0">
					{#each items as l (l.id)}
						<li>
							<button
								type="button"
								class="flex min-h-14 w-full items-center gap-3 px-5 py-2 text-left hover:bg-surface-2"
								onclick={() => onedit(l)}
								aria-label="{l.name}, {amountLabel(l)}, {formatInt(Number(l.kcal))} kcal. Edit"
							>
								<span class="w-12 shrink-0 text-[0.875rem] text-ink-2 nums"
									>{time.format(new Date(l.eaten_at))}</span
								>
								<span class="min-w-0 flex-1">
									<span class="block truncate font-semibold">{l.name}</span>
									<span class="block text-[0.875rem] text-ink-2"
										>{amountLabel(l)}{l.estimated ? ' · estimated' : ''}</span
									>
								</span>
								<span class="font-semibold nums">{formatInt(Number(l.kcal))}</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<button
					type="button"
					class="mx-3 mb-2 flex min-h-11 items-center gap-2 rounded-control px-2 font-semibold text-brand-ink hover:bg-surface-2"
					onclick={() => onlog(slot)}
				>
					<Icon name="plus" size={20} />Log {label.toLowerCase()}
				</button>
			{/if}
		</section>
	{/each}
</Card>
