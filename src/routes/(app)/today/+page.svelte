<script lang="ts">
	import { resolve } from '$app/paths';
	import IconButton from '$lib/ui/IconButton.svelte';
	import Placeholder from '$lib/ui/Placeholder.svelte';
</script>

<Placeholder title="Today" icon="today" phase="Phase 1">
	{#snippet actions()}
		<IconButton icon="settings" label="Settings" href={resolve('/settings')} class="lg:hidden" />
	{/snippet}
</Placeholder>
