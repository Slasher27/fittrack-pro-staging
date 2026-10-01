<script lang="ts" generics="T extends string">
	// A radio group styled as segments: real radios inside a fieldset (DESIGN-SYSTEM §5).
	type Props = { legend: string; options: { value: T; label: string }[]; value: T };
	let { legend, options, value = $bindable() }: Props = $props();
	const name = $props.id();
</script>

<fieldset class="m-0 min-w-0 border-0 p-0">
	<legend class="mb-2 text-[0.875rem] font-semibold">{legend}</legend>
	<div class="flex rounded-control border border-line-strong bg-surface-2 p-1">
		{#each options as opt (opt.value)}
			<label
				class="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-[9px] border border-transparent px-3 text-[0.9375rem] font-medium text-ink-2 has-checked:border-line-strong has-checked:bg-surface has-checked:font-semibold has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
			>
				<input class="sr-only" type="radio" {name} value={opt.value} bind:group={value} />
				{opt.label}
			</label>
		{/each}
	</div>
</fieldset>
