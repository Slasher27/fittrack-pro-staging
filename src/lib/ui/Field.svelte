<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from './Icon.svelte';

	// Label + input + hint + error. The label is always visible (DESIGN-SYSTEM §3).
	type Props = HTMLInputAttributes & { label: string; hint?: string; error?: string };
	let {
		label,
		hint,
		error,
		value = $bindable(),
		type = 'text',
		id: idProp,
		...rest
	}: Props = $props();
	// An id from the caller (e.g. to focus the input) keeps the label linked.
	const generated = $props.id();
	const id = $derived(idProp ?? generated);
	const describedBy = $derived(
		[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="flex flex-col gap-1.5">
	<label for={id} class="text-[0.875rem] font-semibold">{label}</label>
	<input
		{id}
		{type}
		bind:value
		aria-invalid={error ? true : undefined}
		aria-describedby={describedBy}
		class="min-h-12 w-full rounded-control border bg-surface px-3.5 text-body text-ink placeholder:text-ink-2 {error
			? 'border-warn'
			: 'border-line-strong'}"
		{...rest}
	/>
	{#if hint}<p id="{id}-hint" class="m-0 text-[0.875rem] text-ink-2">{hint}</p>{/if}
	{#if error}
		<p
			id="{id}-error"
			class="m-0 flex items-start gap-1.5 text-[0.875rem] font-medium text-warn-ink"
		>
			<Icon name="warning" size={18} class="mt-px shrink-0" />{error}
		</p>
	{/if}
</div>
