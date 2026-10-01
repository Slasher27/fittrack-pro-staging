import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, PASSWORD, signUp } from './helpers';

async function fillTargets(page: Page, t: Record<string, string>) {
	for (const [label, value] of Object.entries(t)) await page.getByLabel(label).fill(value);
}

const TARGETS = {
	'Calories per day (kcal)': '2200',
	'Calories on training days (kcal, optional)': '2350',
	'Protein (g)': '180',
	'Carbs (g)': '210',
	'Fat (g)': '75',
	'Water per day (ml)': '3000'
};

test('set targets by hand: validation, macro check, saved on the device', async ({ page }) => {
	await signUp(page);
	await page.goto('/settings');
	await page.getByRole('link', { name: 'Nutrition targets' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Nutrition targets' })).toBeVisible();
	await expect(page.getByText('You haven’t set targets yet.')).toBeVisible();
	await expectAccessible(page);

	await page.getByRole('button', { name: 'Save targets' }).click();
	await expect(page.getByLabel('Calories per day (kcal)')).toBeFocused();
	await expect(
		page.getByText('Enter a whole number from 800 to 10000 kcal.').first()
	).toBeVisible();
	await expectAccessible(page);

	await fillTargets(page, TARGETS);
	// 180×4 + 210×4 + 75×9 = 2235 kcal, within 50 of 2200.
	await expect(
		page.getByText('These macros add up to 2,235 kcal, which matches your calorie target.')
	).toBeVisible();
	await page.getByRole('button', { name: 'Save targets' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Targets saved.' })).toBeVisible();

	await page.reload();
	await expect(page.getByLabel('Protein (g)')).toHaveValue('180');
	await expect(page.getByText('You haven’t set targets yet.')).toBeHidden();
});

test('targets saved offline sync to another device', async ({ page, context, browser }) => {
	const email = await signUp(page);
	await page.goto('/settings/targets');
	await expect(page.getByText('You haven’t set targets yet.')).toBeVisible();

	await context.setOffline(true);
	await fillTargets(page, { ...TARGETS, 'Protein (g)': '190' });
	await expect(page.getByText('You’re offline.')).toBeVisible();
	await page.getByRole('button', { name: 'Save targets' }).click();
	await expect(
		page.getByText('Targets saved on this device. They’ll sync when you’re online.')
	).toBeVisible();

	await context.setOffline(false);
	await page.goto('/settings');
	await expect(page.getByText('Everything is saved to your account.')).toBeVisible({
		timeout: 15_000
	});

	// A second device: a fresh browser context signs in as the same member.
	const other = await browser.newContext({ viewport: page.viewportSize()! });
	const page2 = await other.newPage();
	await page2.goto('/sign-in?next=%2Fsettings%2Ftargets');
	await page2.getByLabel('Email').fill(email);
	await page2.getByLabel('Password').fill(PASSWORD);
	await page2.getByRole('button', { name: 'Sign in' }).click();
	await expect(page2.getByLabel('Protein (g)')).toHaveValue('190');
	await other.close();
});
