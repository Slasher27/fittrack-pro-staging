<script lang="ts">
	// Photo, or initials when there is none. Decorative when a name is already shown next to it.
	type Props = { name: string; src?: string | null; size?: number; decorative?: boolean };
	let { name, src = null, size = 40, decorative = false }: Props = $props();

	const initials = $derived(
		name
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('') || '?'
	);
</script>

<span
	class="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 font-semibold text-ink"
	style:width="{size}px"
	style:height="{size}px"
	style:font-size="{Math.round(size * 0.38)}px"
	role={decorative ? undefined : 'img'}
	aria-label={decorative ? undefined : name}
	aria-hidden={decorative || undefined}
>
	{#if src}
		<img {src} alt="" class="size-full object-cover" />
	{:else}
		<span aria-hidden="true">{initials}</span>
	{/if}
</span>
