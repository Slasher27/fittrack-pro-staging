<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { forgetLocal, local, syncNow } from '$lib/data/local.svelte';
	import { net } from '$lib/net.svelte';
	import { supabase } from '$lib/supabase/client';
	import Button from '$lib/ui/Button.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	// Sign-out (D-036): this member's data leaves the device, but never while changes are unsynced
	// unless they explicitly choose to lose them.
	let busy = $state(false);
	let confirmOpen = $state(false);

	async function signOut() {
		busy = true;
		await syncNow();
		busy = false;
		if (local.pending > 0) confirmOpen = true;
		else await finish();
	}

	async function retry() {
		busy = true;
		await syncNow();
		busy = false;
		if (local.pending === 0) {
			confirmOpen = false;
			await finish();
		}
	}

	async function finish() {
		busy = true;
		await forgetLocal();
		// Local scope: works offline and only ends this device's session.
		const { error } = await supabase!.auth.signOut({ scope: 'local' });
		busy = false;
		if (error) return toast('We couldn’t sign you out. Try again.', 'warn');
		await goto(resolve('/sign-in'), { replaceState: true });
	}
</script>

<Button variant="secondary" {busy} onclick={signOut}>
	<Icon name="signout" size={20} />Sign out
</Button>

<Sheet bind:open={confirmOpen} title="Changes not synced yet">
	<p class="mt-0">
		{local.pending}
		{local.pending === 1 ? 'change is' : 'changes are'} saved on this device but haven’t reached your
		account. If you sign out now, {local.pending === 1 ? 'it' : 'they'} will be lost.
	</p>
	{#if !net.online}
		<p class="mb-0 text-ink-2">You’re offline. Connect to sync them first.</p>
	{/if}
	{#snippet footer()}
		<div class="flex flex-col gap-2 sm:flex-row-reverse">
			<Button {busy} disabled={!net.online} onclick={retry}>Sync, then sign out</Button>
			<Button variant="destructive" disabled={busy} onclick={finish}>Sign out and lose them</Button>
		</div>
	{/snippet}
</Sheet>
