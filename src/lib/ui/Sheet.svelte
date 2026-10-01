<script lang="ts">
	import type { Snippet } from 'svelte';
	import IconButton from './IconButton.svelte';

	// Bottom sheet on phone, centred dialog from 640 px. Native <dialog>: modal focus trap, Esc closes.
	type Props = { open: boolean; title: string; children: Snippet; footer?: Snippet };
	let { open = $bindable(false), title, children, footer }: Props = $props();

	let dialog: HTMLDialogElement;
	let opener: HTMLElement | null = null;
	const titleId = $props.id();

	$effect(() => {
		if (open && !dialog.open) {
			opener = document.activeElement as HTMLElement | null;
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	function onclose() {
		open = false;
		opener?.focus();
	}
</script>

<dialog
	bind:this={dialog}
	{onclose}
	aria-labelledby={titleId}
	class="sheet m-0 mt-auto w-full max-w-none border border-line bg-surface p-0 text-ink sm:m-auto sm:max-w-lg sm:rounded-card"
	onclick={(e) => e.target === dialog && (open = false)}
>
	<div class="flex max-h-[85dvh] flex-col">
		<header class="flex items-center justify-between gap-2 border-b border-line py-2 pr-2 pl-5">
			<h2 id={titleId} class="m-0 text-title">{title}</h2>
			<IconButton icon="close" label="Close" onclick={() => (open = false)} />
		</header>
		<div class="overflow-y-auto p-5">{@render children()}</div>
		{#if footer}<footer class="border-t border-line p-4">{@render footer()}</footer>{/if}
	</div>
</dialog>

<style>
	.sheet {
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		max-height: 85dvh;
	}
	.sheet::backdrop {
		background: color-mix(in srgb, var(--ink) 40%, transparent);
	}
	@media (prefers-reduced-motion: no-preference) {
		.sheet[open] {
			animation: rise 200ms var(--ease-out);
		}
	}
	@keyframes rise {
		from {
			transform: translateY(24px);
			opacity: 0;
		}
	}
</style>
