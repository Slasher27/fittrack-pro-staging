<script lang="ts">
	import BrandLogo from '$lib/ui/BrandLogo.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import { net } from '$lib/net.svelte';
	import { supabase, BACKEND_MISSING } from '$lib/supabase/client';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col items-center px-5 py-10 sm:justify-center">
	<main id="main" class="flex w-full max-w-sm flex-col gap-6">
		<BrandLogo />
		{#if !supabase}
			<Notice tone="warn">{BACKEND_MISSING}</Notice>
		{:else if !net.online}
			<Notice tone="warn">You’re offline. Signing in needs a connection.</Notice>
		{/if}
		{@render children()}
	</main>
</div>
