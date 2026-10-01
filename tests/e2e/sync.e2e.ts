import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, signOut, signUp } from './helpers';

/** Names of this origin's IndexedDB databases. */
const databases = (page: Page) =>
	page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? ''));

test('settings shows sync status, and signing out removes the device data', async ({ page }) => {
	await signUp(page);
	await page.goto('/settings');
	const status = page.getByRole('status').filter({ hasText: 'Synced' });
	await expect(status).toContainText('Synced just now. Everything is saved to your account.');
	await expectAccessible(page);
	expect((await databases(page)).some((n) => n.startsWith('fittrack-pro-'))).toBe(true);

	await signOut(page);
	expect((await databases(page)).some((n) => n.startsWith('fittrack-pro-'))).toBe(false);
});

test('signing out with unsynced changes warns first (D-036)', async ({ page, context }) => {
	await signUp(page);
	await page.goto('/settings');
	await expect(page.getByText('Synced just now.')).toBeVisible();

	// Go offline and leave one unsynced change in the outbox.
	await context.setOffline(true);
	await page.evaluate(async () => {
		const name = (await indexedDB.databases()).find((d) =>
			d.name?.startsWith('fittrack-pro-')
		)!.name!;
		const db = await new Promise<IDBDatabase>((res, rej) => {
			const r = indexedDB.open(name);
			r.onsuccess = () => res(r.result);
			r.onerror = () => rej(r.error);
		});
		const tx = db.transaction(['water_logs', 'outbox'], 'readwrite');
		const id = crypto.randomUUID();
		tx.objectStore('water_logs').put({
			id,
			at: new Date().toISOString(),
			ml: 250,
			up: Date.now(),
			deleted: false
		});
		tx.objectStore('outbox').put({
			key: `water_logs:${id}`,
			table: 'water_logs',
			id,
			up: Date.now()
		});
		await new Promise((res) => (tx.oncomplete = res));
		db.close();
	});

	await page.getByRole('button', { name: 'Sign out' }).click();
	const dialog = page.getByRole('dialog', { name: 'Changes not synced yet' });
	await expect(dialog).toContainText('1 change is saved on this device');
	await expect(dialog).toContainText('You’re offline.');
	await expect(dialog.getByRole('button', { name: 'Sync, then sign out' })).toBeDisabled();
	await expectAccessible(page);

	await dialog.getByRole('button', { name: 'Sign out and lose them' }).click();
	await expect(page).toHaveURL(/\/sign-in$/);
	expect((await databases(page)).some((n) => n.startsWith('fittrack-pro-'))).toBe(false);
	await context.setOffline(false);
});
