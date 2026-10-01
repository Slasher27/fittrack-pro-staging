<script lang="ts" module>
	// 24 px stroke icons. Decorative: the control that holds one supplies the accessible name.
	const paths = {
		today: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
		train: 'M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12',
		nutrition: 'M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17 3c-1.7 1.3-2.5 3.5-2.5 6.5V14H17v7',
		progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
		coach: 'M4 5h16v11H9l-5 4z',
		settings:
			'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z',
		users:
			'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8',
		programs: 'M8 3h8v4H8zM6 5H4v16h16V5h-2M8 12h8M8 16h5',
		library: 'M4 4h5v16H4zM9 4h5v16H9zM14.5 4.5l4.8-1.3 3.7 15.5-4.8 1.2z',
		checkins: 'M4 4h16v16H4zM8 12l3 3 5-6',
		messages: 'M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z',
		brand:
			'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.3-1-1.5-1-2.6 0-.8.7-1.4 1.5-1.4H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5zM7.5 12.5h.01M9.5 8h.01M14.5 8h.01',
		switch: 'M7 16H3l4 4M3 16h14a4 4 0 0 0 4-4M17 8h4l-4-4M21 8H7a4 4 0 0 0-4 4',
		menu: 'M3 6h18M3 12h18M3 18h18',
		close: 'M6 6l12 12M18 6 6 18',
		plus: 'M12 5v14M5 12h14',
		minus: 'M5 12h14',
		check: 'M5 12.5l4.5 4.5L19 7.5',
		swap: 'M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16',
		signout: 'M15 4h4v16h-4M10 17l5-5-5-5M15 12H3',
		offline:
			'M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.2-1.5M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10.7 5M12 20h.01',
		info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
		warning:
			'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01'
	} as const;
	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	let {
		name,
		size = 24,
		class: klass = ''
	}: { name: IconName; size?: number; class?: string } = $props();
</script>

<svg
	class={klass}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"><path d={paths[name]} /></svg
>
