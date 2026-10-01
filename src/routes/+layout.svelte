<script lang="ts">
	import '../app.css';
	import Toaster from '$lib/ui/Toaster.svelte';

	let { children } = $props();
</script>

<a
	href="#main"
	class="sr-only-focusable fixed top-2 left-2 z-50 rounded-control bg-brand px-4 py-3 font-semibold text-on-brand"
	>Skip to content</a
>
{@render children()}
<Toaster />
