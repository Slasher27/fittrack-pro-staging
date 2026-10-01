<script lang="ts">
	import { resolve } from '$app/paths';
	import { local } from '$lib/data/local.svelte';
	import { relog as relogFood } from '$lib/data/nutrition';
	import type { LocalRow } from '$lib/data/tables';
	import { amountLabel, mealSlotAt, recentFoods } from '$lib/domain/day';
	import { formatInt } from '$lib/format';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Quick log (PRD §4.1): one tap re-logs a recent food with the same amount, now.
	type Props = { recent: LocalRow<'food_logs'>[]; tz: string };
	let { recent, tz }: Props = $props();

	const items = $derived(recentFoods(recent, 6));

	async function relog(l: LocalRow<'food_logs'>) {
		if (!local.db) return;
		const now = new Date();
		try {
			await relogFood(local.db, l, mealSlotAt(now, tz), now.toISOString());
			toast(`Logged ${l.name}, ${amountLabel(l)}.`, 'ok');
		} catch {
			toast('We couldn’t save that. Try again.', 'warn');
		}
	}
</script>

<Card as="section" class="flex flex-col gap-2" aria-labelledby="quick-log">
	<h2 id="quick-log" class="m-0 text-title">Log again</h2>
	{#if items.length}
		<ul class="m-0 flex list-none flex-col p-0">
			{#each items as l (l.id)}
				<li class="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
					<div class="min-w-0 flex-1">
						<p class="m-0 truncate font-semibold">{l.name}</p>
						<p class="m-0 text-[0.9375rem] text-ink-2 nums">
							{amountLabel(l)} · {formatInt(Number(l.kcal))} kcal
						</p>
					</div>
					<Button
						variant="secondary"
						compact
						aria-label="Log {l.name}, {amountLabel(l)}, again"
						onclick={() => relog(l)}>Log</Button
					>
				</li>
			{/each}
		</ul>
	{:else}
		<EmptyState
			icon="nutrition"
			headingLevel={3}
			title="Nothing to repeat yet"
			body="Foods you log appear here, so you can log them again with one tap."
		>
			{#snippet action()}<a href={resolve('/nutrition')} class="font-semibold">Go to Nutrition</a
				>{/snippet}
		</EmptyState>
	{/if}
</Card>
