import { defineConfig, devices } from '@playwright/test';

// E2E + axe at 390 and 1280 px (ARCHITECTURE §10). Needs local Supabase running and
// PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example).
export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: true,
	// Long offline flows sign up, sync and log a whole day; local Supabase on a laptop is the bottleneck.
	timeout: 60_000,
	expect: { timeout: 10_000 },
	workers: process.env.CI ? undefined : 4,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
	webServer: {
		command: 'pnpm build && pnpm preview --port 4173 --strictPort',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		env: { PUBLIC_DEV_ROUTES: '1' }
	},
	projects: [
		{
			name: 'phone',
			use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true }
		},
		{
			name: 'laptop',
			use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
		}
	]
});
