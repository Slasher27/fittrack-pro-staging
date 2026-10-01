<script lang="ts">
	import { resolve } from '$app/paths';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { auth } from '$lib/auth.svelte';
	import BrandLogo from '$lib/ui/BrandLogo.svelte';
	import Icon, { type IconName } from '$lib/ui/Icon.svelte';
	import IconButton from '$lib/ui/IconButton.svelte';

	let { children } = $props();

	type TrainerPath =
		`/trainer/${'clients' | 'programs' | 'library' | 'checkins' | 'messages' | 'brand'}`;

	// Trainer sidebar (DESIGN-SYSTEM §4). On phone it becomes a top-level menu.
	const items: { path: TrainerPath; label: string; icon: IconName }[] = [
		{ path: '/trainer/clients', label: 'Clients', icon: 'users' },
		{ path: '/trainer/programs', label: 'Programs', icon: 'programs' },
		{ path: '/trainer/library', label: 'Exercise library', icon: 'library' },
		{ path: '/trainer/checkins', label: 'Check-ins', icon: 'checkins' },
		{ path: '/trainer/messages', label: 'Messages', icon: 'messages' },
		{ path: '/trainer/brand', label: 'Brand & settings', icon: 'brand' }
	];
	const isCurrent = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(href + '/');

	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false));

	$effect(() => {
		if (!auth.session) goto(resolve('/sign-in'), { replaceState: true });
	});

	const link =
		'flex min-h-11 items-center gap-3 rounded-control px-3 font-semibold no-underline hover:bg-surface-2';
</script>

<div class="lg:flex">
	<header
		class="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface px-3 py-1.5 lg:hidden"
	>
		<BrandLogo size={28} />
		<IconButton
			icon={menuOpen ? 'close' : 'menu'}
			label="Menu"
			aria-expanded={menuOpen}
			aria-controls="trainer-nav"
			onclick={() => (menuOpen = !menuOpen)}
		/>
	</header>

	<nav
		id="trainer-nav"
		aria-label="Trainer"
		class="{menuOpen
			? 'flex'
			: 'hidden'} fixed inset-x-0 top-14 bottom-0 z-40 flex-col overflow-y-auto bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r lg:border-line"
	>
		<div class="mb-6 hidden lg:block"><BrandLogo /></div>
		<ul class="m-0 flex list-none flex-col gap-1 p-0">
			{#each items as item (item.path)}
				{@const current = isCurrent(item.path)}
				<li>
					<a
						href={resolve(item.path)}
						aria-current={current ? 'page' : undefined}
						class="{link} {current ? 'bg-brand-tint text-brand-ink' : 'text-ink-2'}"
					>
						<Icon name={item.icon} size={22} />{item.label}
					</a>
				</li>
			{/each}
		</ul>
		<a href={resolve('/today')} class="{link} mt-auto border-t border-line pt-3 text-ink-2">
			<Icon name="switch" size={22} />Switch to my training
		</a>
	</nav>

	<main id="main" class="min-w-0 flex-1 px-5 py-6 lg:px-10 lg:py-10">
		<div class="mx-auto max-w-6xl">{@render children()}</div>
	</main>
</div>
