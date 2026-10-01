<script lang="ts">
	// The trainer's logo when coached (DESIGN-SYSTEM §6), otherwise the product wordmark.
	type Props = { src?: string | null; name?: string; size?: number };
	let { src = null, name = 'FitTrack Pro', size = 32 }: Props = $props();
</script>

{#if src}
	<img {src} alt={name} style:height="{size}px" class="w-auto rounded-[8px]" />
{:else}
	<span
		class="inline-flex items-center gap-2 font-bold tracking-tight"
		style:font-size="{size * 0.56}px"
	>
		<span
			class="grid place-items-center rounded-[8px] bg-brand text-on-brand"
			style:width="{size}px"
			style:height="{size}px"
			aria-hidden="true">F</span
		>
		{name}
	</span>
{/if}
