<script lang="ts">
	// A token swatch: the colour plus its name and use (colour is never the only label).
	let { token, use }: { token: string; use: string } = $props();
</script>

<li class="flex flex-col gap-1.5">
	<span class="h-14 rounded-control border border-line" style:background="var(--{token})"></span>
	<code class="text-[0.875rem] font-semibold">--{token}</code>
	<span class="text-[0.875rem] text-ink-2">{use}</span>
</li>
