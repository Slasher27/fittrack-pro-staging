<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import { del, put } from '$lib/data/repo';
	import type { LocalRow } from '$lib/data/tables';
	import {
		toMeasurement,
		validateMeasure,
		type MeasureErrors,
		type MeasureForm
	} from '$lib/domain/body';
	import Button from '$lib/ui/Button.svelte';
	import Field from '$lib/ui/Field.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// One entry per date: weight and/or measurements and a note. Editing a date updates its entry.
	type Row = LocalRow<'body_metrics'>;
	type Props = { open: boolean; entry: Row | null; entries: Row[]; today: string };
	let { open = $bindable(), entry, entries, today }: Props = $props();

	const s = (v: number | null) => (v == null ? '' : String(v));
	let form = $state<MeasureForm>({
		date: '',
		weight_kg: '',
		waist_cm: '',
		chest_cm: '',
		arm_cm: '',
		thigh_cm: '',
		notes: ''
	});
	let errors = $state<MeasureErrors>({});
	let busy = $state(false);

	$effect(() => {
		if (!open) return;
		form = {
			date: entry?.date ?? today,
			weight_kg: s(entry?.weight_kg ?? null),
			waist_cm: s(entry?.waist_cm ?? null),
			chest_cm: s(entry?.chest_cm ?? null),
			arm_cm: s(entry?.arm_cm ?? null),
			thigh_cm: s(entry?.thigh_cm ?? null),
			notes: entry?.notes ?? ''
		};
		errors = {};
	});

	async function save(e: SubmitEvent) {
		e.preventDefault();
		// Adding on a date that has an entry updates it; moving an entry onto such a date is refused.
		const taken = entry
			? entries.filter((r) => r.id !== entry.id && !r.deleted).map((r) => r.date)
			: [];
		errors = validateMeasure(form, today, taken);
		if (Object.keys(errors).length) {
			queueMicrotask(() =>
				document.querySelector<HTMLElement>('#measure-form [aria-invalid="true"]')?.focus()
			);
			return;
		}
		if (!local.db || !auth.session) return;
		busy = true;
		const existing = entry ?? entries.find((r) => r.date === form.date && !r.deleted);
		try {
			await put(local.db, 'body_metrics', {
				...(existing ?? { id: crypto.randomUUID(), steps: null, deleted: false }),
				user_id: auth.session.user.id,
				date: form.date,
				...toMeasurement(form),
				up: 0
			});
			open = false;
			toast('Measurements saved.', 'ok');
		} catch {
			errors = { form: 'We couldn’t save this on your device. Try again.' };
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!entry || !local.db) return;
		await del(local.db, 'body_metrics', entry.id);
		open = false;
		toast('Entry removed.');
	}
</script>

<Sheet bind:open title={entry ? 'Edit entry' : 'Add measurements'}>
	<form id="measure-form" class="flex flex-col gap-4" onsubmit={save} novalidate>
		{#if errors.form}<Notice tone="warn" alert>{errors.form}</Notice>{/if}
		<Field label="Date" type="date" max={today} bind:value={form.date} error={errors.date} />
		<Field
			label="Weight (kg)"
			inputmode="decimal"
			bind:value={form.weight_kg}
			error={errors.weight_kg}
		/>
		<fieldset class="m-0 grid grid-cols-2 gap-4 border-0 p-0">
			<legend class="mb-2 text-[0.875rem] font-semibold">Measurements (cm, optional)</legend>
			<Field label="Waist" inputmode="decimal" bind:value={form.waist_cm} error={errors.waist_cm} />
			<Field label="Chest" inputmode="decimal" bind:value={form.chest_cm} error={errors.chest_cm} />
			<Field label="Arm" inputmode="decimal" bind:value={form.arm_cm} error={errors.arm_cm} />
			<Field label="Thigh" inputmode="decimal" bind:value={form.thigh_cm} error={errors.thigh_cm} />
		</fieldset>
		<Field
			label="Note (optional)"
			placeholder="e.g. morning, fasted"
			bind:value={form.notes}
			error={errors.notes}
		/>
	</form>
	{#snippet footer()}
		<div class="flex flex-col gap-2 sm:flex-row-reverse">
			<Button type="submit" form="measure-form" {busy} full>Save</Button>
			{#if entry}<Button variant="destructive" onclick={remove}>Remove entry</Button>{/if}
		</div>
	{/snippet}
</Sheet>
