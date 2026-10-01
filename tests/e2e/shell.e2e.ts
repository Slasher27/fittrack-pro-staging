import { expect, test } from '@playwright/test';
import { signUp } from './helpers';

test('member tabs navigate and mark the current tab', async ({ page }) => {
	await signUp(page);
	const nav = page.getByRole('navigation', { name: 'Main' });
	for (const name of ['Train', 'Nutrition', 'Progress', 'Coach', 'Today']) {
		await nav.getByRole('link', { name }).click();
		await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
		await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
	}
});

test('trainer workspace has the sidebar items and a way back', async ({ page, isMobile }, info) => {
	await signUp(page);
	await page.goto('/trainer');
	await expect(page).toHaveURL(/\/trainer\/clients$/);
	if (info.project.name === 'phone' || isMobile)
		await page.getByRole('button', { name: 'Menu' }).click();
	const nav = page.getByRole('navigation', { name: 'Trainer' });
	for (const name of [
		'Clients',
		'Programs',
		'Exercise library',
		'Check-ins',
		'Messages',
		'Brand & settings'
	]) {
		await expect(nav.getByRole('link', { name })).toBeVisible();
	}
	await nav.getByRole('link', { name: 'Messages' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible();
	if (info.project.name === 'phone') await page.getByRole('button', { name: 'Menu' }).click();
	await nav.getByRole('link', { name: 'Switch to my training' }).click();
	await expect(page).toHaveURL(/\/today$/);
});

test('theme setting persists', async ({ page }) => {
	await signUp(page);
	await page.goto('/settings');
	await page.getByRole('radio', { name: 'Dark' }).check({ force: true });
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
});

test('installable PWA: manifest and service worker', async ({ page, request }) => {
	const manifest = await (await request.get('/manifest.webmanifest')).json();
	expect(manifest.display).toBe('standalone');
	expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);

	await page.goto('/sign-in');
	const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
	expect(scope).toMatch(/\/$/);
});

test('signed-in shell loads offline from the service worker', async ({ page, context }) => {
	await signUp(page);
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload(); // Let the active worker control the page.
	await context.setOffline(true);
	await page.goto('/progress');
	await expect(page.getByRole('heading', { level: 1, name: 'Progress' })).toBeVisible();
	await context.setOffline(false);
});
