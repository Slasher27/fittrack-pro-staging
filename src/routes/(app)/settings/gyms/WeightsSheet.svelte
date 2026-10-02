<script lang="ts">
	import { setWeights, type ItemRow } from '$lib/data/gyms';
	import { local } from '$lib/data/local.svelte';
	import type { CatalogItem } from '$lib/domain/catalog';
	import {
		addWeight,
		parseKg,
		validateWeights,
		type Range,
		type Weights
	} from '$lib/domain/equipment';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Weights per item (kg): a range {min, max, step} for adjustable kit, or a list of what you have.
	type Props = { open: boolean; item: CatalogItem | null; row: ItemRow | null };
	let { open = $bindable(), item, row }: Props = $props();

	let range = $state({ min: '', max: '', step: '' });
	let list = $state<number[]>([]);
	let adding = $state('');
	let addError = $state('');
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		if (!open || !row) return;
		const w = row.weights as Weights;
		const r = w && !Array.isArray(w) ? w : null;
		range = {
			min: r ? String(r.min) : '',
			max: r ? String(r.max) : '',
			step: r ? String(r.step) : ''
		};
		list = Array.isArray(w) ? [...w] : [];
		adding = '';
		addError = '';
		error = '';
	});

	function add() {
		const kg = parseKg(adding);
		if (kg === null) {
			addError = 'Enter a weight in kg, for example 12.5.';
			return;
		}
		list = addWeight(list, kg);
		adding = '';
		addError = '';
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (!item || !row || !local.db) return;
		const value: Weights =
			item.weight_kind === 'range'
				? ({ min: parseKg(range.min), max: parseKg(range.max), step: parseKg(range.step) } as Range)
				: [...list];
		error = validateWeights(item.weight_kind, value) ?? '';
		if (error) return;
		busy = true;
		try {
			await setWeights(local.db, row.id, value);
			open = false;
			toast('Weights saved.', 'ok');
		} catch {
			error = 'We couldn’t save this on your device. Try again.';
		} finally {
			busy = false;
		}
	}
</script>

<Sheet bind:open title={item ? `${item.name}: weights` : 'Weights'}>
	{#if item}
		<form id="weights-form" class="flex flex-col gap-4" onsubmit={save} novalidate>
			{#if error}<Notice tone="warn" alert>{error}</Notice>{/if}
			{#if item.weight_kind === 'range'}
				<div class="grid grid-cols-3 gap-3">
					<Field label="Lightest (kg)" inputmode="decimal" bind:value={range.min} />
					<Field label="Heaviest (kg)" inputmode="decimal" bind:value={range.max} />
					<Field label="Steps (kg)" inputmode="decimal" bind:value={range.step} />
				</div>
			{:else}
				<div>
					<h3 class="mt-0 mb-2 text-[0.875rem] font-semibold">Weights you have</h3>
					{#if list.length}
						<ul class="m-0 flex list-none flex-wrap gap-2 p-0">
							{#each list as kg (kg)}
								<li>
									<button
										type="button"
										class="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 font-medium tabular-nums hover:bg-surface-2"
										aria-label="Remove {kg} kg"
										onclick={() => (list = list.filter((x) => x !== kg))}
									>
										{kg} kg<Icon name="close" size={16} />
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="m-0 text-ink-2">None yet. Add the weights you have.</p>
					{/if}
				</div>
				<div class="flex items-end gap-2">
					<div class="min-w-0 flex-1">
						<Field
							label="Add a weight (kg)"
							inputmode="decimal"
							bind:value={adding}
							error={addError}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault();
									add();
								}
							}}
						/>
					</div>
					<Button variant="secondary" class={addError ? 'mb-7' : ''} onclick={add}>Add</Button>
				</div>
			{/if}
		</form>
	{/if}
	{#snippet footer()}
		<Button type="submit" form="weights-form" full {busy}>Save weights</Button>
	{/snippet}
</Sheet>
