import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, expectNoHorizontalScroll, PASSWORD, signUp } from './helpers';

/** A real PNG to upload, like a camera photo: a screenshot of part of the page. */
async function testImage(page: Page) {
	return {
		name: 'front.png',
		mimeType: 'image/png',
		buffer: await page.screenshot({ clip: { x: 0, y: 0, width: 60, height: 80 } })
	};
}

test('Progress: measurements offline, edit, one entry per date', async ({ page, context }) => {
	await signUp(page);
	await page.goto('/progress');
	await expect(page.getByRole('heading', { name: 'No entries yet' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'No photos yet' })).toBeVisible();
	await expectAccessible(page);
	await expectNoHorizontalScroll(page);

	await context.setOffline(true);
	await page.getByRole('button', { name: 'Add entry' }).click();
	const sheet = page.getByRole('dialog', { name: 'Add measurements' });
	await sheet.getByRole('button', { name: 'Save' }).click();
	await expect(sheet.getByRole('alert')).toContainText('Enter at least one measurement.');
	await sheet.getByLabel('Weight (kg)').fill('81,4');
	await sheet.getByLabel('Waist').fill('86');
	await sheet.getByLabel('Note (optional)').fill('Fasted');
	await expectAccessible(page);
	await sheet.getByRole('button', { name: 'Save' }).click();

	const table = page.getByRole('table');
	await expect(table.getByRole('cell', { name: '81.4 kg' })).toBeVisible();
	await expect(table).toContainText('Waist 86');
	await expect(table).toContainText('Fasted');
	await expect(page.getByText('Weight · 7-day average')).toBeVisible();

	// Adding again for the same date updates that entry instead of making a second one.
	await page.getByRole('button', { name: 'Add entry' }).click();
	await page.getByRole('dialog', { name: 'Add measurements' }).getByLabel('Weight (kg)').fill('81');
	await page
		.getByRole('dialog', { name: 'Add measurements' })
		.getByRole('button', { name: 'Save' })
		.click();
	await expect(table.getByRole('cell', { name: '81 kg' })).toBeVisible();
	await expect(table.getByRole('row')).toHaveCount(2); // header + one entry

	await table.getByRole('button', { name: /^Edit entry for/ }).click();
	await page
		.getByRole('dialog', { name: 'Edit entry' })
		.getByRole('button', { name: 'Remove entry' })
		.click();
	await expect(page.getByRole('heading', { name: 'No entries yet' })).toBeVisible();
	await context.setOffline(false);
});

test('Progress photos: add offline, view, delete; upload reaches another device', async ({
	page,
	context,
	browser
}) => {
	const email = await signUp(page);
	await page.goto('/progress');
	const photo = await testImage(page);

	await context.setOffline(true);
	await page.getByRole('button', { name: 'Add photo' }).click();
	const add = page.getByRole('dialog', { name: 'Add photo' });
	await add.getByRole('button', { name: 'Save photo' }).click();
	await expect(add.getByText('Choose or take a photo.')).toBeVisible();
	await add.getByLabel('Photo').setInputFiles(photo);
	await expect(add.getByRole('img', { name: 'Preview of your selection' })).toBeVisible();
	await add.getByRole('radio', { name: 'Side' }).check();
	await add.getByLabel('Note (optional)').fill('Morning');
	await expectAccessible(page);
	await add.getByRole('button', { name: 'Save photo' }).click();
	await expect(page.getByText('Photo saved. Only you can see it.')).toBeVisible();

	const thumb = page.getByRole('button', { name: /^View Side photo/ });
	await expect(thumb.locator('img')).toBeVisible();
	await thumb.click();
	const view = page.getByRole('dialog', { name: /^Side photo/ });
	await expect(view.getByText('Morning')).toBeVisible();
	await view.getByRole('button', { name: 'Delete photo' }).click();
	await view.getByRole('button', { name: 'Yes, delete photo' }).click();
	await expect(page.getByRole('heading', { name: 'No photos yet' })).toBeVisible();

	// Online: a new photo uploads, and a second device downloads it.
	await context.setOffline(false);
	await page.getByRole('button', { name: 'Add photo' }).click();
	await page.getByRole('dialog', { name: 'Add photo' }).getByLabel('Photo').setInputFiles(photo);
	await page
		.getByRole('dialog', { name: 'Add photo' })
		.getByRole('button', { name: 'Save photo' })
		.click();
	await expect(page.getByRole('button', { name: /^View Front photo/ })).toBeVisible();

	// Re-opening starts clean: no stale file left in the picker (a bug the screenshots caught).
	await page.getByRole('button', { name: 'Add photo' }).click();
	const again = page.getByRole('dialog', { name: 'Add photo' });
	await expect(again.getByLabel('Photo')).toHaveValue('');
	await again.getByRole('button', { name: 'Save photo' }).click();
	await expect(again.getByText('Choose or take a photo.')).toBeVisible();
	await again.getByLabel('Photo').setInputFiles(photo);
	await again.getByRole('radio', { name: 'Back' }).check();
	await again.getByRole('button', { name: 'Save photo' }).click();
	await expect(page.getByRole('button', { name: /^View Back photo/ })).toBeVisible();

	await page.goto('/settings');
	await expect(page.getByText('Everything is saved to your account.')).toBeVisible({
		timeout: 20_000
	});

	const other = await browser.newContext({ viewport: page.viewportSize()! });
	const page2 = await other.newPage();
	await page2.goto('/sign-in?next=%2Fprogress');
	await page2.getByLabel('Email').fill(email);
	await page2.getByLabel('Password').fill(PASSWORD);
	await page2.getByRole('button', { name: 'Sign in' }).click();
	await expect(page2.getByRole('button', { name: /^View Front photo/ }).locator('img')).toBeVisible(
		{ timeout: 20_000 }
	);
	await other.close();
});
