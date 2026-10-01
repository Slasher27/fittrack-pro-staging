import { expect, test } from '@playwright/test';
import { PASSWORD, signUp, uniqueEmail, signOut } from './helpers';

const MAILPIT = 'http://127.0.0.1:54324';

test('signed-out visitors are sent to sign-in and back afterwards', async ({ page }) => {
	const email = await signUp(page);
	await signOut(page);
	await expect(page).toHaveURL(/\/sign-in$/);

	await page.goto('/nutrition');
	await expect(page).toHaveURL(/\/sign-in\?next=%2Fnutrition$/);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/nutrition$/);
});

test('sign-in shows a clear error for a wrong password', async ({ page }) => {
	const email = await signUp(page);
	await signOut(page);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('wrong password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByRole('alert')).toContainText('don’t match');
});

test('sign-up enforces the age gate and consent', async ({ page }) => {
	await page.goto('/sign-up');
	await page.getByLabel('Your name').fill('Teen');
	await page.getByLabel('Email').fill(uniqueEmail('teen'));
	await page.getByLabel('Password').fill(PASSWORD);
	const lastYear = new Date().getFullYear() - 1;
	await page.getByLabel('Date of birth').fill(`${lastYear}-01-01`);
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(
		page.getByText('FitTrack Pro is for adults (18 or older).', { exact: true })
	).toBeVisible();
	await expect(page.getByText('You need to agree to this to use FitTrack Pro.')).toBeVisible();
	await expect(page.getByLabel('Date of birth')).toBeFocused();
	await expect(page).toHaveURL(/\/sign-up$/);
});

test('password reset by email', async ({ page, request }) => {
	const email = await signUp(page);
	await signOut(page);

	await page.goto('/reset');
	await page.getByLabel('Email').fill(email);
	await page.getByRole('button', { name: 'Send reset link' }).click();
	await expect(page.getByText(/we’ve emailed it a link/)).toBeVisible();

	// Read the link from the local Supabase mail catcher (Mailpit).
	let link = '';
	await expect(async () => {
		const search = await request.get(
			`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(email)}`
		);
		const { messages } = await search.json();
		expect(messages.length).toBeGreaterThan(0);
		const msg = await (await request.get(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
		link = /https?:\/\/[^\s"<>]+verify[^\s"<>]+/
			.exec(msg.Text ?? msg.HTML)![0]
			.replaceAll('&amp;', '&');
	}).toPass({ timeout: 15_000 });

	await page.goto(link);
	await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
	await page.getByLabel('New password').fill('a brand new password');
	await page.getByRole('button', { name: 'Save password' }).click();
	await expect(page).toHaveURL(/\/today$/);

	await signOut(page);
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('a brand new password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/today$/);
});
