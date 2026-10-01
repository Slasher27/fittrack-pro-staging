import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct horse battery';

export function uniqueEmail(tag: string) {
	return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
}

/** Sign up through the UI (age gate + consent) and land on Today. */
export async function signUp(page: Page, email = uniqueEmail('member'), name = 'Lisa Test') {
	await page.goto('/sign-up');
	await page.getByLabel('Your name').fill(name);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(PASSWORD);
	await page.getByLabel('Date of birth').fill('1994-05-12');
	await page.getByRole('checkbox', { name: /process my health information/ }).check();
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL(/\/today$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
	return email;
}

/** Zero serious or critical axe violations (DESIGN-SYSTEM §5). */
export async function expectAccessible(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
	expect(
		serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

/** No horizontal page scroll (DESIGN-SYSTEM §5). */
export async function expectNoHorizontalScroll(page: Page) {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);
}
