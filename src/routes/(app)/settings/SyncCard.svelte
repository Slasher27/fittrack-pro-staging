<script lang="ts">
	import { local, syncNow } from '$lib/data/local.svelte';
	import { timeAgo } from '$lib/domain/dates';
	import { net } from '$lib/net.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Icon from '$lib/ui/Icon.svelte';

	// Re-render the relative time every 30 s.
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(id);
	});

	const summary = $derived.by(() => {
		if (!net.online || local.status === 'offline')
			return 'Offline. Changes are saved on this device.';
		if (local.status === 'syncing') return 'Syncing…';
		if (local.status === 'error') return 'Couldn’t sync. We’ll try again shortly.';
		return local.lastSyncAt ? `Synced ${timeAgo(local.lastSyncAt, now)}.` : 'Not synced yet.';
	});
	const waiting = $derived(
		local.pending > 0
			? `${local.pending} ${local.pending === 1 ? 'change' : 'changes'} waiting to sync.`
			: local.lastSyncAt === null || local.status !== 'idle'
				? '' // not confirmed yet: only a finished sync proves everything reached the account
				: 'Everything is saved to your account.'
	);
</script>

<Card as="section" aria-labelledby="sync">
	<h2 id="sync" class="mt-0 mb-1 text-title">Sync</h2>
	<!-- Polite live region for sync status (DESIGN-SYSTEM §5). -->
	<div role="status" class="mb-4 flex items-start gap-2 text-ink-2">
		<Icon name={net.online ? 'check' : 'offline'} size={20} class="mt-0.5 shrink-0" />
		<p class="m-0">{summary} {waiting}</p>
	</div>
	<Button
		variant="secondary"
		busy={local.status === 'syncing'}
		disabled={!net.online}
		onclick={syncNow}
	>
		Sync now
	</Button>
</Card>
