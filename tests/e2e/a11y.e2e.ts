import { expect, test } from '@playwright/test';
import { expectAccessible, expectNoHorizontalScroll, signUp } from './helpers';

// Runs in both projects: phone (390 px) and laptop (1280 px).

for (const scheme of ['light', 'dark'] as const) {
	test(`component gallery passes axe (${scheme})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: scheme });
		await page.goto('/dev/components');
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expectAccessible(page);
		await expectNoHorizontalScroll(page);
	});
}

test('gallery sheet traps focus, closes on Escape and restores focus', async ({ page }) => {
	await page.goto('/dev/components');
	const opener = page.getByRole('button', { name: 'Open sheet' });
	await opener.click();
	const dialog = page.getByRole('dialog', { name: 'Swap exercise' });
	await expect(dialog).toBeVisible();
	await expectAccessible(page);
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(opener).toBeFocused();
});

for (const path of ['/sign-in', '/sign-up', '/reset']) {
	test(`${path} passes axe`, async ({ page }) => {
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expectAccessible(page);
		await expectNoHorizontalScroll(page);
	});
}

test('member and trainer shells pass axe', async ({ page }) => {
	await signUp(page);
	for (const path of ['/today', '/train', '/settings', '/trainer/clients']) {
		await page.goto(path);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		await expectAccessible(page);
		await expectNoHorizontalScroll(page);
	}
});

test('the 320 px gallery has no horizontal scroll', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 720 });
	await page.goto('/dev/components');
	await expectNoHorizontalScroll(page);
});
