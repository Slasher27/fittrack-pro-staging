import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// SPA: no Node server, every route falls back to 200.html (ARCHITECTURE §1).
			adapter: adapter({ fallback: '200.html' })
		})
	],
	test: {
		expect: { requireAssertions: true },
		environment: 'node',
		include: ['tests/unit/**/*.test.ts']
	}
});
