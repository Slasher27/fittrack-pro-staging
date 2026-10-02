import { expect, test } from '@playwright/test';
import { expectAccessible, expectNoHorizontalScroll, PASSWORD, signUp } from './helpers';

test('Gym profiles: default Home, catalogue items, weights, custom kit, full equipment', async ({
	page
}) => {
	await signUp(page);
	await page.goto('/settings');
	await page.getByRole('link', { name: 'Gym profiles' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Gym profiles' })).toBeVisible();

	// "Home" is created after the first sync, without full equipment.
	await expect(page.getByRole('heading', { level: 2, name: 'Home' })).toBeVisible({
		timeout: 15_000
	});
	await expect(page.getByRole('switch', { name: /Full equipment/ })).not.toBeChecked();
	await expectAccessible(page);
	await expectNoHorizontalScroll(page);

	// Tick catalogue items; kettlebells start with 12, 16, 24 kg.
	await page.getByRole('checkbox', { name: /^Kettlebells/ }).check();
	await page.getByRole('checkbox', { name: /^Flat bench/ }).check();
	await expect(page.getByText('12, 16, 24 kg')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Edit weights for Flat bench' })).toHaveCount(0);

	// Edit the list: add 20 kg, remove 12 kg.
	await page.getByRole('button', { name: 'Edit weights for Kettlebells' }).click();
	const sheet = page.getByRole('dialog', { name: 'Kettlebells: weights' });
	await sheet.getByLabel('Add a weight (kg)').fill('abc');
	await sheet.getByRole('button', { name: 'Add', exact: true }).click();
	await expect(sheet.getByText('Enter a weight in kg, for example 12.5.')).toBeVisible();
	await sheet.getByLabel('Add a weight (kg)').fill('20');
	await sheet.getByLabel('Add a weight (kg)').press('Enter');
	await sheet.getByRole('button', { name: 'Remove 12 kg' }).click();
	await expectAccessible(page);
	await sheet.getByRole('button', { name: 'Save weights' }).click();
	await expect(page.getByText('16, 20, 24 kg')).toBeVisible();

	// A range item.
	await page.getByRole('checkbox', { name: /^Adjustable dumbbells/ }).check();
	await expect(page.getByText('2 – 32 kg · 2 kg steps')).toBeVisible();
	await page.getByRole('button', { name: 'Edit weights for Adjustable dumbbells' }).click();
	const range = page.getByRole('dialog', { name: 'Adjustable dumbbells: weights' });
	await range.getByLabel('Heaviest (kg)').fill('1');
	await range.getByRole('button', { name: 'Save weights' }).click();
	await expect(
		range.getByText('The lightest weight must not be more than the heaviest.')
	).toBeVisible();
	await range.getByLabel('Heaviest (kg)').fill('24');
	await range.getByRole('button', { name: 'Save weights' }).click();
	await expect(page.getByText('2 – 24 kg · 2 kg steps')).toBeVisible();

	// Custom kit must count as at least one thing.
	await page.getByRole('button', { name: 'Add custom equipment' }).click();
	const custom = page.getByRole('dialog', { name: 'Add custom equipment' });
	await custom.getByRole('button', { name: 'Save' }).click();
	await expect(custom.getByText('Name this equipment.')).toBeVisible();
	await expect(
		custom.getByText('Choose at least one thing it counts as, so workouts can use it.')
	).toBeVisible();
	await custom.getByLabel('Name').fill('Sandbag');
	await custom.getByRole('button', { name: 'Kettlebell' }).click();
	await expect(custom.getByRole('button', { name: 'Kettlebell' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expectAccessible(page);
	await custom.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByRole('button', { name: 'Edit Sandbag' })).toBeVisible();

	// Full equipment hides the list; turning it off brings the same kit back.
	await page.getByRole('switch', { name: /Full equipment/ }).check();
	await expect(page.getByRole('checkbox', { name: /^Kettlebells/ })).toBeHidden();
	await page.getByRole('switch', { name: /Full equipment/ }).uncheck();
	await expect(page.getByRole('checkbox', { name: /^Kettlebells/ })).toBeChecked();

	// Unticking keeps nothing listed; ticking again restores the edited weights.
	await page.getByRole('checkbox', { name: /^Kettlebells/ }).uncheck();
	await expect(page.getByText('16, 20, 24 kg')).toBeHidden();
	await page.getByRole('checkbox', { name: /^Kettlebells/ }).check();
	await expect(page.getByText('16, 20, 24 kg')).toBeVisible();

	await page.reload();
	await expect(page.getByText('16, 20, 24 kg')).toBeVisible();
	await expect(page.getByRole('checkbox', { name: /^Flat bench/ })).toBeChecked();
	await page.getByRole('link', { name: 'Done' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
});

test('a gym added offline syncs to another device; deleting asks first', async ({
	page,
	context,
	browser
}) => {
	const email = await signUp(page);
	await page.goto('/settings/gyms');
	await expect(page.getByRole('heading', { level: 2, name: 'Home' })).toBeVisible({
		timeout: 15_000
	});

	await context.setOffline(true);
	await expect(page.getByText('You’re offline.')).toBeVisible();
	await page.getByRole('button', { name: 'Add gym' }).click();
	const add = page.getByRole('dialog', { name: 'Add a gym' });
	await add.getByLabel('Name').fill('Virgin Active');
	await add.getByLabel('Type').selectOption('commercial');
	await add.getByRole('button', { name: 'Add gym' }).click();
	await expect(page.getByRole('heading', { level: 2, name: 'Virgin Active' })).toBeVisible();
	// A name longer than the segments fit switches the picker to a select (no overflow at 390 px).
	await expect(page.getByRole('combobox', { name: 'Gym' }).locator('option:checked')).toHaveText(
		'Virgin Active'
	);
	await expectNoHorizontalScroll(page);
	await expect(page.getByRole('switch', { name: /Full equipment/ })).toBeChecked();
	await page.getByRole('switch', { name: /Full equipment/ }).uncheck();
	await page.getByRole('checkbox', { name: /^Smith machine/ }).check();

	await context.setOffline(false);
	await page.goto('/settings');
	await expect(page.getByText('Everything is saved to your account.')).toBeVisible({
		timeout: 15_000
	});

	const other = await browser.newContext({ viewport: page.viewportSize()! });
	const page2 = await other.newPage();
	await page2.goto('/sign-in?next=%2Fsettings%2Fgyms');
	await page2.getByLabel('Email').fill(email);
	await page2.getByLabel('Password').fill(PASSWORD);
	await page2.getByRole('button', { name: 'Sign in' }).click();
	await page2
		.getByRole('combobox', { name: 'Gym' })
		.selectOption({ label: 'Virgin Active' }, { timeout: 15_000 });
	await expect(page2.getByRole('checkbox', { name: /^Smith machine/ })).toBeChecked();
	// The second device found Home on the server and didn't create another one.
	await expect(page2.getByRole('option', { name: 'Home' })).toHaveCount(1);

	await page2.getByRole('button', { name: 'Edit Virgin Active' }).click();
	const edit = page2.getByRole('dialog', { name: 'Edit gym' });
	await edit.getByRole('button', { name: 'Delete this gym' }).click();
	await expect(edit.getByText('Delete Virgin Active and its equipment?')).toBeVisible();
	await edit.getByRole('button', { name: 'Yes, delete Virgin Active' }).click();
	await expect(page2.getByRole('radio', { name: 'Virgin Active' })).toHaveCount(0);
	await expect(page2.getByRole('radio', { name: 'Home' })).toBeChecked();
	await expect(page2.getByRole('heading', { level: 2, name: 'Home' })).toBeVisible();
	await other.close();
});
