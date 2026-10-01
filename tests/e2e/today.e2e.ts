import { expect, test } from '@playwright/test';
import { expectAccessible, expectNoHorizontalScroll, seed, signUp } from './helpers';

const ago = (days: number) => new Date(Date.now() - days * 86_400_000);
const date = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });

test('Today: empty states for a new member', async ({ page }) => {
	await signUp(page, undefined, 'Lisa Jacobs');
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Lisa');
	await expect(page.getByText('Set your targets')).toBeVisible();
	await expect(page.getByText('No weight in the last 7 days.')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Nothing to repeat yet' })).toBeVisible();
	await expectAccessible(page);
	await expectNoHorizontalScroll(page);
});

test('Today: targets, one-tap re-log, water and weight, all offline', async ({ page, context }) => {
	await signUp(page);
	await seed(page, 'targets', [
		{
			id: crypto.randomUUID(),
			effective_from: '2026-01-01',
			kcal: 2000,
			kcal_train: null,
			protein_g: 150,
			carbs_g: 200,
			fat_g: 70,
			water_ml: 2500,
			set_by: 'self',
			set_by_id: null
		}
	]);
	await seed(page, 'food_logs', [
		{
			id: crypto.randomUUID(),
			eaten_at: ago(1).toISOString(),
			meal_slot: 'breakfast',
			food_id: null,
			name: 'Oats',
			grams: 80,
			servings: null,
			serving_label: null,
			kcal: 300,
			protein_g: 10,
			carbs_g: 54,
			fat_g: 6,
			estimated: false
		}
	]);
	await seed(page, 'body_metrics', [
		{
			id: crypto.randomUUID(),
			date: date(ago(8)),
			weight_kg: 82.4,
			waist_cm: null,
			chest_cm: null,
			arm_cm: null,
			thigh_cm: null,
			steps: null,
			notes: null
		},
		{
			id: crypto.randomUUID(),
			date: date(ago(2)),
			weight_kg: 81.8,
			waist_cm: null,
			chest_cm: null,
			arm_cm: null,
			thigh_cm: null,
			steps: null,
			notes: null
		}
	]);
	await page.reload();

	await expect(page.getByRole('img', { name: '0 of 2,000 kcal eaten. 2,000 left.' })).toBeVisible();
	await expect(page.getByText('81.8')).toBeVisible();
	await expect(page.getByText('−0.6 kg this week')).toBeVisible();
	await expectAccessible(page);

	await context.setOffline(true);
	await expect(page.getByText('You’re offline.')).toBeVisible();

	// Quick log: ≤ 2 taps from Today.
	await page.getByRole('button', { name: 'Log Oats, 80 g, again' }).click();
	await expect(page.getByRole('status').filter({ hasText: 'Logged Oats, 80 g.' })).toBeVisible();
	await expect(
		page.getByRole('img', { name: '300 of 2,000 kcal eaten. 1,700 left.' })
	).toBeVisible();
	await expect(page.getByRole('meter', { name: 'Protein' })).toHaveAttribute('aria-valuenow', '10');

	await page.getByRole('button', { name: 'Add 250 millilitres of water' }).click();
	await page.getByRole('button', { name: 'Add 500 millilitres of water' }).click();
	await expect(page.getByRole('meter', { name: 'Water today' })).toHaveAttribute(
		'aria-valuetext',
		'0.75 of 2.5 litres'
	);
	await page.getByRole('button', { name: 'Undo last' }).click();
	await expect(page.getByRole('meter', { name: 'Water today' })).toHaveAttribute(
		'aria-valuetext',
		'0.25 of 2.5 litres'
	);

	await page.getByRole('button', { name: 'Log weight' }).click();
	const sheet = page.getByRole('dialog', { name: 'Log weight' });
	await sheet.getByLabel('Weight today (kg)').fill('nope');
	await sheet.getByRole('button', { name: 'Save' }).click();
	await expect(sheet.getByText('Enter your weight in kg')).toBeVisible();
	await sheet.getByLabel('Weight today (kg)').fill('81,4');
	await sheet.getByRole('button', { name: 'Save' }).click();
	await expect(sheet).toBeHidden();
	await expect(page.getByRole('button', { name: 'Edit today’s weight' })).toBeVisible();
	await expect(page.getByText('81.6')).toBeVisible(); // (81.8 + 81.4) / 2

	// Back online: everything reaches the account.
	await context.setOffline(false);
	await page.goto('/settings');
	await expect(page.getByText('Everything is saved to your account.')).toBeVisible({
		timeout: 15_000
	});
});
