<script lang="ts">
	import Button from './Button.svelte';

	// Stores an end timestamp, never a ticking counter, so it stays right after the phone locks (T40).
	type Props = { endsAt: number | null; onskip?: () => void };
	let { endsAt = $bindable(), onskip }: Props = $props();

	let now = $state(Date.now());
	$effect(() => {
		if (endsAt === null) return;
		const id = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(id);
	});

	const left = $derived(endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000)));
	const mmss = $derived(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
	const adjust = (s: number) =>
		endsAt !== null && (endsAt = Math.max(Date.now(), endsAt + s * 1000));
</script>

<div class="flex flex-wrap items-center gap-3 rounded-card bg-surface-2 p-4">
	<div class="flex flex-col">
		<span class="label text-ink-2">Rest</span>
		<!-- role="timer" is not announced every second (implicit aria-live="off"). -->
		<span role="timer" aria-label="Rest time left" class="text-display nums">{mmss}</span>
	</div>
	<div class="ml-auto flex gap-2">
		<Button variant="secondary" compact onclick={() => adjust(-15)}>−15 s</Button>
		<Button variant="secondary" compact onclick={() => adjust(15)}>+15 s</Button>
		<Button variant="ghost" compact onclick={() => ((endsAt = null), onskip?.())}>Skip</Button>
	</div>
</div>
