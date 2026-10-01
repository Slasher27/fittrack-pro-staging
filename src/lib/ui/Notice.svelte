<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	// Inline status banner: icon + text, never colour alone. `alert` for errors after a user action.
	type Props = { tone?: 'neutral' | 'warn' | 'ok'; alert?: boolean; children: Snippet };
	let { tone = 'neutral', alert = false, children }: Props = $props();

	const tones = {
		neutral: { cls: 'border-line bg-surface-2 text-ink', icon: 'info' },
		warn: { cls: 'border-warn bg-warn-tint text-warn-ink', icon: 'warning' },
		ok: { cls: 'border-ok bg-ok-tint text-ok-ink', icon: 'check' }
	} as const;
</script>

<div
	role={alert ? 'alert' : undefined}
	class="flex items-start gap-2.5 rounded-control border px-4 py-3 text-[0.9375rem] font-medium {tones[
		tone
	].cls}"
>
	<Icon name={tones[tone].icon} size={20} class="mt-0.5 shrink-0" />
	<div class="flex-1">{@render children()}</div>
</div>
