<script lang="ts">
	import { setTheme, theme, type ThemePref } from '$lib/theme/theme.svelte';
	import Avatar from '$lib/ui/Avatar.svelte';
	import BrandLogo from '$lib/ui/BrandLogo.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Chip from '$lib/ui/Chip.svelte';
	import EmptyState from '$lib/ui/EmptyState.svelte';
	import Field from '$lib/ui/Field.svelte';
	import IconButton from '$lib/ui/IconButton.svelte';
	import MacroBar from '$lib/ui/MacroBar.svelte';
	import Notice from '$lib/ui/Notice.svelte';
	import ProgressRing from '$lib/ui/ProgressRing.svelte';
	import RestTimer from '$lib/ui/RestTimer.svelte';
	import SegmentedControl from '$lib/ui/SegmentedControl.svelte';
	import SetRow from '$lib/ui/SetRow.svelte';
	import Sheet from '$lib/ui/Sheet.svelte';
	import Stat from '$lib/ui/Stat.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import Swatch from './Swatch.svelte';

	let pref = $state<ThemePref>(theme.pref);
	$effect(() => setTheme(pref));

	const principles = [
		['One job per screen', 'Today shows what to do now. Everything else is one tap away.'],
		[
			'Logging is fast',
			'A food in 10 seconds or less from Today; a prefilled set in 2 taps or less.'
		],
		[
			'Equipment-aware everywhere',
			'Every workout knows its location. Swaps never suggest missing kit.'
		],
		[
			'Coach in the loop, not in the way',
			'Trainer notes appear in context. Solo members get the same app minus the coach layer.'
		]
	];
	const surfaces = [
		['bg', 'App background'],
		['surface', 'Cards, sheets, tab bar'],
		['surface-2', 'Insets, coach note, rest timer'],
		['line', 'Decorative dividers'],
		['line-strong', 'Input borders (3:1)'],
		['ink', 'Primary text'],
		['ink-2', 'Secondary text'],
		['brand', 'Tappable things (trainer-overridable)'],
		['brand-tint', 'Active tab, selected chips']
	];
	const data = [
		['protein', 'Protein'],
		['carbs', 'Carbs'],
		['fat', 'Fat'],
		['ok', 'On track'],
		['ok-tint', 'On-track chips'],
		['warn', 'Attention (icons, borders)'],
		['warn-tint', 'Warning banners']
	];

	let locations = $state({ home: true, commercial: false, park: false });
	let goalWeight = $state('60');
	let weightError = $derived(
		Number.isFinite(Number(goalWeight)) && goalWeight ? '' : 'Enter a number in kg.'
	);
	let units = $state<'metric' | 'imperial'>('metric');
	let sheetOpen = $state(false);
	let set = $state({ weightKg: 60, reps: 8, done: false });
	let restEndsAt = $state<number | null>(null);
</script>

<svelte:head><title>Components · FitTrack Pro</title></svelte:head>

<main id="main" class="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-8 lg:px-10 lg:py-14">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-2">
			<p class="m-0 label text-ink-2">FitTrack Pro · Design foundations · A · Quiet</p>
			<h1 class="m-0 text-display">Calm, fast, legible.</h1>
			<p class="m-0 text-ink-2">
				One accent colour, generous space, numbers first. Built for a sweaty thumb between sets.
			</p>
		</div>
		<div class="w-full sm:w-72">
			<SegmentedControl
				legend="Theme"
				bind:value={pref}
				options={[
					{ value: 'auto', label: 'Auto' },
					{ value: 'light', label: 'Light' },
					{ value: 'dark', label: 'Dark' }
				]}
			/>
		</div>
	</header>

	<section aria-labelledby="principles">
		<h2 id="principles" class="sr-only">Principles</h2>
		<ol class="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
			{#each principles as [title, body], i (title)}
				<Card as="li" class="flex flex-col gap-2">
					<span class="label text-ink-2">0{i + 1}</span>
					<h3 class="m-0 text-[1.125rem] leading-6 font-semibold">{title}</h3>
					<p class="m-0 text-[0.9375rem] text-ink-2">{body}</p>
				</Card>
			{/each}
		</ol>
	</section>

	<div class="grid gap-6 lg:grid-cols-12">
		<Card as="section" class="flex flex-col gap-4 lg:col-span-7" aria-labelledby="colour">
			<h2 id="colour" class="m-0 text-title">Colour</h2>
			<h3 class="m-0 label text-ink-2">Surfaces, text and brand</h3>
			<ul class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
				{#each surfaces as [token, use] (token)}<Swatch {token} {use} />{/each}
			</ul>
			<h3 class="m-0 label text-ink-2">Data and status (always with a text label)</h3>
			<ul class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
				{#each data as [token, use] (token)}<Swatch {token} {use} />{/each}
			</ul>
		</Card>

		<div class="flex flex-col gap-6 lg:col-span-5">
			<Card as="section" class="flex flex-col gap-3" aria-labelledby="type">
				<h2 id="type" class="m-0 text-title">Type · Geist</h2>
				<dl class="m-0 flex flex-col">
					{#each [['text-display', 'Display', '32 / 38 · 700'], ['text-title', 'Title', '22 / 28 · 600'], ['text-body', 'Body — default reading size', '16 / 24 · 400'], ['label', 'Label', '13 · 600 · caps']] as [cls, name, spec] (name)}
						<div class="flex items-baseline justify-between gap-3 border-b border-line py-2">
							<dt class="{cls} m-0">{name}</dt>
							<dd class="m-0 shrink-0 text-[0.875rem] text-ink-2">{spec}</dd>
						</div>
					{/each}
					<div class="flex items-baseline justify-between gap-3 py-2">
						<dt class="m-0 text-[1.75rem] font-semibold nums">1,240 kcal</dt>
						<dd class="m-0 text-[0.875rem] text-ink-2">Numbers · tabular</dd>
					</div>
				</dl>
			</Card>

			<Card as="section" class="flex flex-col gap-4" aria-labelledby="controls">
				<h2 id="controls" class="m-0 text-title">Controls</h2>
				<div class="flex flex-wrap gap-2.5">
					<Button>Start workout</Button>
					<Button variant="secondary">Swap exercise</Button>
					<Button variant="ghost">Skip</Button>
					<Button variant="destructive" compact>Delete photo</Button>
					<IconButton icon="settings" label="Settings" />
				</div>
				<div class="flex flex-wrap gap-2" role="group" aria-label="Location">
					<Chip bind:pressed={locations.home}>Home gym</Chip>
					<Chip bind:pressed={locations.commercial}>Commercial gym</Chip>
					<Chip bind:pressed={locations.park}>Park</Chip>
					<Chip>Static chip</Chip>
				</div>
				<Field
					label="Goal weight (kg)"
					inputmode="decimal"
					bind:value={goalWeight}
					hint="We use it to set your targets."
					error={weightError}
				/>
				<SegmentedControl
					legend="Units"
					bind:value={units}
					options={[
						{ value: 'metric', label: 'Metric' },
						{ value: 'imperial', label: 'Imperial' }
					]}
				/>
			</Card>
		</div>
	</div>

	<section aria-labelledby="data-heading" class="grid gap-6 lg:grid-cols-3">
		<h2 id="data-heading" class="sr-only">Data display</h2>
		<Card class="flex items-center gap-5">
			<ProgressRing value={1240} max={2100} label="1,240 of 2,100 kcal eaten">
				<span class="block text-title nums">1,240</span><span class="text-[0.8125rem] text-ink-2"
					>of 2,100 kcal</span
				>
			</ProgressRing>
			<div class="flex flex-col gap-4">
				<Stat label="Weight" value="81.4" unit="kg" delta="−0.6 kg this week" />
				<Stat label="Streak" value="5" unit="days" delta="On track" tone="ok" />
			</div>
		</Card>
		<Card class="flex flex-col gap-4">
			<MacroBar macro="protein" grams={132} target={176} />
			<MacroBar macro="carbs" grams={140} target={210} />
			<MacroBar macro="fat" grams={48} target={72} />
		</Card>
		<Card class="flex flex-col gap-3">
			<Notice>Coach note: keep the last set at RPE 8.</Notice>
			<Notice tone="ok">Synced just now.</Notice>
			<Notice tone="warn">Home gym has no cable machine. We swapped 1 exercise.</Notice>
		</Card>
	</section>

	<section aria-labelledby="logger" class="grid gap-6 lg:grid-cols-2">
		<Card class="flex flex-col gap-3">
			<h2 id="logger" class="m-0 text-title">Workout logger</h2>
			<SetRow index={1} bind:weightKg={set.weightKg} bind:reps={set.reps} bind:done={set.done} />
			{#if restEndsAt === null}
				<Button variant="secondary" onclick={() => (restEndsAt = Date.now() + 90_000)}
					>Start 90 s rest</Button
				>
			{:else}
				<RestTimer bind:endsAt={restEndsAt} />
			{/if}
		</Card>
		<Card class="flex flex-col gap-3">
			<h2 class="m-0 text-title">Sheets, toasts, people</h2>
			<div class="flex flex-wrap gap-2.5">
				<Button variant="secondary" onclick={() => (sheetOpen = true)}>Open sheet</Button>
				<Button variant="secondary" onclick={() => toast('Logged 250 ml water.', 'ok')}
					>Show toast</Button
				>
			</div>
			<div class="flex items-center gap-3">
				<Avatar name="Lisa Jacobs" />
				<Avatar name="Duwayne" size={48} />
				<BrandLogo />
			</div>
			<EmptyState
				icon="nutrition"
				title="No food logged yet"
				body="Log your first meal from Today."
				headingLevel={3}
			/>
		</Card>
	</section>

	<div class="grid gap-6 lg:grid-cols-2">
		<Card as="section" aria-labelledby="a11y">
			<h2 id="a11y" class="mt-0 mb-3 text-title">Accessibility non-negotiables</h2>
			<ul class="m-0 grid gap-x-6 gap-y-1 pl-5 text-[0.9375rem] sm:grid-cols-2">
				<li>Text contrast 4.5:1 minimum (3:1 at 24 px+)</li>
				<li>Touch targets 44 × 44, primary actions 48</li>
				<li>Text scaling to 200%</li>
				<li>Colour never carries meaning alone</li>
				<li>Every icon button has a spoken label</li>
				<li>Visible focus ring, full keyboard on web</li>
				<li>Respects reduced motion</li>
				<li>Primary actions in thumb reach</li>
			</ul>
		</Card>
		<Card as="section" aria-labelledby="nav">
			<h2 id="nav" class="mt-0 mb-3 text-title">Navigation</h2>
			<dl class="m-0 flex flex-col gap-2.5 text-[0.9375rem]">
				<div class="flex gap-3">
					<dt class="min-w-24 label text-ink-2">Client app</dt>
					<dd class="m-0">Today · Train · Nutrition · Progress · Coach</dd>
				</div>
				<div class="flex gap-3">
					<dt class="min-w-24 label text-ink-2">Solo member</dt>
					<dd class="m-0">Same five tabs. The Coach tab is the AI coach.</dd>
				</div>
				<div class="flex gap-3">
					<dt class="min-w-24 label text-ink-2">Trainer</dt>
					<dd class="m-0">
						Clients · Programs · Exercise library · Check-ins · Messages · Brand & settings, then
						“Switch to my training”.
					</dd>
				</div>
			</dl>
		</Card>
	</div>
</main>

<Sheet bind:open={sheetOpen} title="Swap exercise">
	<p class="mt-0">Alternatives your Home gym can do:</p>
	<ul class="m-0 pl-5">
		<li>Dumbbell bench press</li>
		<li>Push-up</li>
	</ul>
	{#snippet footer()}<Button full onclick={() => (sheetOpen = false)}>Done</Button>{/snippet}
</Sheet>
