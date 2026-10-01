<script lang="ts">
	import Icon from './Icon.svelte';
	import IconButton from './IconButton.svelte';

	// One set: weight and reps with large ± steppers (no keyboard, D-030) and a done toggle.
	type Props = {
		index: number;
		weightKg: number;
		reps: number;
		done: boolean;
		weightStep?: number;
	};
	let {
		index,
		weightKg = $bindable(),
		reps = $bindable(),
		done = $bindable(),
		weightStep = 2.5
	}: Props = $props();

	const fmt = (kg: number) => (Number.isInteger(kg) ? String(kg) : kg.toFixed(1));
</script>

<div
	role="group"
	aria-label="Set {index}"
	class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border p-3 {done
		? 'border-ok bg-ok-tint'
		: 'border-line bg-surface'}"
>
	<span class="w-12 label text-ink-2">Set {index}</span>

	<div class="flex items-center gap-1">
		<IconButton
			icon="minus"
			label="Less weight, set {index}"
			onclick={() => (weightKg = Math.max(0, weightKg - weightStep))}
		/>
		<output class="min-w-16 text-center text-title nums" aria-live="polite">
			{fmt(weightKg)}<span class="ml-0.5 text-[0.875rem] font-medium text-ink-2">kg</span>
		</output>
		<IconButton
			icon="plus"
			label="More weight, set {index}"
			onclick={() => (weightKg += weightStep)}
		/>
	</div>

	<div class="flex items-center gap-1">
		<IconButton
			icon="minus"
			label="Fewer reps, set {index}"
			onclick={() => (reps = Math.max(0, reps - 1))}
		/>
		<output class="min-w-14 text-center text-title nums" aria-live="polite">
			{reps}<span class="ml-0.5 text-[0.875rem] font-medium text-ink-2">reps</span>
		</output>
		<IconButton icon="plus" label="More reps, set {index}" onclick={() => (reps += 1)} />
	</div>

	<button
		type="button"
		aria-pressed={done}
		onclick={() => (done = !done)}
		class="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-control px-4 font-semibold {done
			? 'bg-ok-ink text-surface'
			: 'border border-line-strong bg-surface text-ink'}"
	>
		<Icon name="check" size={20} />{done ? 'Done' : 'Log set'}
	</button>
</div>
