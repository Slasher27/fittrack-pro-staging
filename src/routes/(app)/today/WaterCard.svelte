<script lang="ts">
	import { auth } from '$lib/auth.svelte';
	import { local } from '$lib/data/local.svelte';
	import { del, put } from '$lib/data/repo';
	import type { LocalRow } from '$lib/data/tables';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	type Props = { logs: LocalRow<'water_logs'>[]; targetMl: number };
	let { logs, targetMl }: Props = $props();

	const ml = $derived(logs.reduce((s, l) => s + l.ml, 0));
	const litres = (v: number) => (v / 1000).toFixed(2).replace(/\.?0+$/, '');
	const pct = $derived(targetMl > 0 ? Math.min((ml / targetMl) * 100, 100) : 0);

	async function add(amount: number) {
		if (!local.db || !auth.session) return;
		try {
			await put(local.db, 'water_logs', {
				id: crypto.randomUUID(),
				user_id: auth.session.user.id,
				at: new Date().toISOString(),
				ml: amount,
				up: 0,
				deleted: false
			});
			toast(`Logged ${amount} ml water.`, 'ok');
		} catch {
			toast('We couldn’t save that. Try again.', 'warn');
		}
	}

	async function undo() {
		const last = [...logs].sort((a, b) => b.at.localeCompare(a.at))[0];
		if (!last || !local.db) return;
		await del(local.db, 'water_logs', last.id);
		toast(`Removed ${last.ml} ml water.`);
	}
</script>

<Card as="section" class="flex flex-col gap-3" aria-labelledby="water-today">
	<h2 id="water-today" class="m-0 label text-ink-2">Water</h2>
	<p class="m-0 nums">
		<span class="text-[1.75rem] leading-8 font-semibold">{litres(ml)}</span>
		<span class="text-ink-2"> / {litres(targetMl)} L</span>
	</p>
	<div
		class="h-2 overflow-hidden rounded-full bg-surface-2"
		role="meter"
		aria-label="Water today"
		aria-valuemin={0}
		aria-valuemax={targetMl}
		aria-valuenow={ml}
		aria-valuetext="{litres(ml)} of {litres(targetMl)} litres"
	>
		<div class="h-full rounded-full bg-brand" style:width="{pct}%"></div>
	</div>
	<div class="flex flex-wrap gap-2">
		<Button
			variant="secondary"
			compact
			aria-label="Add 250 millilitres of water"
			onclick={() => add(250)}
		>
			+250 ml
		</Button>
		<Button
			variant="secondary"
			compact
			aria-label="Add 500 millilitres of water"
			onclick={() => add(500)}
		>
			+500 ml
		</Button>
		{#if logs.length}
			<Button variant="ghost" compact onclick={undo}>Undo last</Button>
		{/if}
	</div>
</Card>
