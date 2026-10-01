<script lang="ts">
	import Icon from './Icon.svelte';
	import IconButton from './IconButton.svelte';
	import { dismiss, toasts } from './toast.svelte';

	const tones = {
		neutral: { cls: 'bg-ink text-bg border-ink', icon: 'info' },
		ok: { cls: 'bg-ok-tint text-ok-ink border-ok', icon: 'check' },
		warn: { cls: 'bg-warn-tint text-warn-ink border-warn', icon: 'warning' }
	} as const;
</script>

<!-- One polite live region that exists from page load, so additions are announced (DESIGN-SYSTEM §5). -->
<div
	role="status"
	aria-live="polite"
	class="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
>
	{#each toasts as t (t.id)}
		<div
			class="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-control border py-1 pr-1 pl-4 font-medium {tones[
				t.tone
			].cls}"
		>
			<Icon name={tones[t.tone].icon} size={20} />
			<span class="flex-1 py-2">{t.message}</span>
			<IconButton
				icon="close"
				label="Dismiss"
				class="text-current hover:bg-transparent"
				onclick={() => dismiss(t.id)}
			/>
		</div>
	{/each}
</div>
