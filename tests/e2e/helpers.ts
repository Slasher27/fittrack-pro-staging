import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'correct horse battery';
/** Today's heading greets the member by time of day. */
export const GREETING = /^Good (morning|afternoon|evening)/;

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
	// Sign-up can be slow when many browsers hit local Supabase at once.
	await expect(page).toHaveURL(/\/today$/, { timeout: 15_000 });
	await expect(page.getByRole('heading', { level: 1, name: GREETING })).toBeVisible();
	return email;
}

/** Sign out from Settings. It syncs first (D-036), which can take a while under parallel test load. */
export async function signOut(page: Page) {
	await page.goto('/settings');
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(/\/sign-in$/, { timeout: 15_000 });
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

/** Put rows straight into the member's device database (no food-logging UI yet in this phase). */
export async function seed(page: Page, table: string, rows: Record<string, unknown>[]) {
	await page.evaluate(
		async ({ table, rows }) => {
			const name = (await indexedDB.databases()).find((d) =>
				d.name?.startsWith('fittrack-pro-')
			)!.name!;
			const userId = name.replace('fittrack-pro-', '');
			const db = await new Promise<IDBDatabase>((res, rej) => {
				const r = indexedDB.open(name);
				r.onsuccess = () => res(r.result);
				r.onerror = () => rej(r.error);
			});
			const tx = db.transaction([table, 'outbox'], 'readwrite');
			for (const row of rows) {
				const full = { user_id: userId, up: Date.now(), deleted: false, ...row };
				tx.objectStore(table).put(full);
				tx.objectStore('outbox').put({ key: `${table}:${row.id}`, table, id: row.id, up: full.up });
			}
			await new Promise((res) => (tx.oncomplete = res));
			db.close();
		},
		{ table, rows }
	);
}
