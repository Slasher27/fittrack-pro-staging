import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, expectNoHorizontalScroll, seed, signUp } from './helpers';

async function createFood(
	page: Page,
	name: string,
	fields: Record<string, string>,
	basis?: RegExp
) {
	await page.getByLabel('Search foods').fill(name);
	await page.getByRole('button', { name: `Create “${name}”` }).click();
	const sheet = page.getByRole('dialog', { name: 'New food' });
	if (basis) await sheet.getByRole('radio', { name: basis }).check();
	for (const [label, value] of Object.entries(fields)) await sheet.getByLabel(label).fill(value);
	await sheet.getByRole('button', { name: 'Save food' }).click();
	await expect(sheet).toBeHidden();
}

test('Nutrition: custom foods, log, edit, delete, multi-add, past days — offline', async ({
	page,
	context
}) => {
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
	await page.goto('/nutrition');
	await expect(page.getByRole('heading', { level: 1, name: 'Nutrition, Today' })).toBeVisible();
	await expect(page.getByText('2,000 kcal left')).toBeVisible();
	await expectAccessible(page);
	await expectNoHorizontalScroll(page);

	await context.setOffline(true);

	// A count food ("1 rusk", 35 g), logged at dinner.
	await page.getByRole('button', { name: 'Log dinner' }).click();
	await expect(page.getByLabel('Search foods')).toBeFocused();
	await createFood(
		page,
		'Test rusks',
		{
			'One serving is': '1 rusk',
			'Serving weight (g, optional)': '35',
			'Calories per 1 rusk (kcal)': '154',
			'Protein per 1 rusk (g)': '3',
			'Carbs per 1 rusk (g)': '24',
			'Fat per 1 rusk (g)': '5'
		},
		/One serving/
	);
	const logSheet = page.getByRole('dialog', { name: 'Test rusks' });
	await expect(logSheet.getByRole('radio', { name: '1 rusk' })).toBeChecked();
	await expect(logSheet.getByRole('radio', { name: 'Dinner' })).toBeChecked();
	await logSheet.getByLabel('Number of servings (1 rusk)').fill('2');
	await expect(logSheet.getByText('308 kcal')).toBeVisible();
	await expectAccessible(page);
	await logSheet.getByRole('button', { name: 'Add to log' }).click();
	await expect(
		page.getByRole('button', { name: 'Test rusks, 2 × 1 rusk, 308 kcal. Edit' })
	).toBeVisible();
	await expect(page.getByText('1,692 kcal left')).toBeVisible();

	// A weight food, then edit the amount in grams.
	await createFood(page, 'Test rice', {
		'Calories per 100 g (kcal)': '130',
		'Carbs per 100 g (g)': '28'
	});
	await page
		.getByRole('dialog', { name: 'Test rice' })
		.getByRole('radio', { name: 'Lunch' })
		.check({ force: true });
	await page
		.getByRole('dialog', { name: 'Test rice' })
		.getByRole('button', { name: 'Add to log' })
		.click();
	await page.getByRole('button', { name: 'Test rice, 100 g, 130 kcal. Edit' }).click();
	const edit = page.getByRole('dialog', { name: 'Test rice' });
	await edit.getByLabel('Amount (g)').fill('180');
	await edit.getByRole('button', { name: 'Save changes' }).click();
	await expect(
		page.getByRole('button', { name: 'Test rice, 180 g, 234 kcal. Edit' })
	).toBeVisible();

	// Multi-add both into snacks, using their last amounts.
	await page.getByRole('button', { name: 'Log snacks' }).click();
	await page.getByLabel('Search foods').fill('test');
	await page.getByRole('checkbox', { name: 'Select Test rusks' }).check();
	await page.getByRole('checkbox', { name: 'Select Test rice' }).check();
	await page.getByRole('button', { name: 'Add 2 foods' }).click();
	await expect(page.getByRole('region', { name: 'Snacks' })).toContainText('Test rice');
	await expect(page.getByText('916 kcal left')).toBeVisible(); // 2000 − 308 − 234 − 308 − 234

	// Remove one.
	await page
		.locator('section[aria-labelledby="slot-snack"]')
		.getByRole('button', { name: /Test rusks/ })
		.click();
	await page
		.getByRole('dialog', { name: 'Test rusks' })
		.getByRole('button', { name: 'Remove from log' })
		.click();
	await expect(page.getByText('1,224 kcal left')).toBeVisible(); // + 308

	// Quick add chip and water.
	await page.getByRole('button', { name: /^Add Test rice, 180 g, 234 kilocalories/ }).click();
	await expect(page.getByText('990 kcal left')).toBeVisible();
	await page.getByRole('button', { name: 'Add 250 millilitres of water' }).click();
	await expect(page.getByRole('meter', { name: 'Water' })).toHaveAttribute('aria-valuenow', '250');

	// Yesterday: log there, and today is unchanged.
	await page.getByRole('button', { name: 'Previous day' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Nutrition, Yesterday' })).toBeVisible();
	await expect(page.getByText('2,000 kcal left')).toBeVisible();
	await page.getByRole('button', { name: 'Log breakfast' }).click();
	await page.getByLabel('Search foods').fill('rice');
	await page
		.getByRole('button', { name: /Test rice/ })
		.first()
		.click();
	await page
		.getByRole('dialog', { name: 'Test rice' })
		.getByRole('button', { name: 'Add to log' })
		.click();
	await expect(page.getByRole('region', { name: 'Breakfast' })).toContainText('08:00');
	await page.getByRole('button', { name: 'Next day' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Nutrition, Today' })).toBeVisible();
	await expect(page.getByText('990 kcal left')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Next day' })).toBeDisabled();

	// Back online: it all reaches the account.
	await context.setOffline(false);
	await page.goto('/settings');
	await expect(page.getByText('Everything is saved to your account.')).toBeVisible({
		timeout: 15_000
	});
});

test('Recipes: build from ingredients + cooked weight, log by grams, edit without rewriting history', async ({
	page,
	context
}) => {
	await signUp(page);
	await page.goto('/nutrition');
	await context.setOffline(true);

	// v3's oracle: 500 g chicken breast + 300 g cooked rice, 1600 g cooked → 76 kcal per 100 g.
	await createFood(page, 'Test chicken breast', {
		'Calories per 100 g (kcal)': '165',
		'Protein per 100 g (g)': '31',
		'Fat per 100 g (g)': '3.6'
	});
	await page.keyboard.press('Escape');
	await createFood(page, 'Test cooked rice', {
		'Calories per 100 g (kcal)': '130',
		'Protein per 100 g (g)': '2.7',
		'Carbs per 100 g (g)': '28',
		'Fat per 100 g (g)': '0.3'
	});
	await page.keyboard.press('Escape');

	await page.getByRole('button', { name: 'New recipe' }).click();
	const sheet = page.getByRole('dialog', { name: 'New recipe' });
	await sheet.getByLabel('Recipe name').fill('Beef curry');
	await sheet.getByLabel('Add an ingredient').fill('chicken');
	await sheet.getByLabel('Raw weight (g)').fill('500');
	await sheet.getByRole('button', { name: 'Add ingredient' }).click();
	await expect(sheet.getByLabel('Add an ingredient')).toBeFocused();
	await sheet.getByLabel('Add an ingredient').fill('rice');
	await sheet.getByRole('radio', { name: 'Test cooked rice' }).check();
	await sheet.getByLabel('Raw weight (g)').fill('300');
	await sheet.getByRole('button', { name: 'Add ingredient' }).click();
	await sheet.getByLabel('Cooked weight of the whole recipe (g)').fill('1600');
	await expect(sheet).toContainText(
		'Whole recipe: 1,215 kcal from 800 g raw. Per 100 g cooked: 76 kcal'
	);
	await expectAccessible(page);
	await sheet.getByRole('button', { name: 'Save recipe' }).click();

	const log = page.getByRole('dialog', { name: 'Beef curry' });
	await log.getByLabel('Amount (g)').fill('220');
	await expect(log.getByText('167 kcal')).toBeVisible();
	await log.getByRole('button', { name: 'Add to log' }).click();
	const entry = page.getByRole('button', { name: 'Beef curry, 220 g, 167 kcal. Edit' });
	await expect(entry).toBeVisible();

	// Edit the recipe (it cooked down more): new logs change, the old one keeps its numbers.
	await entry.click();
	await page
		.getByRole('dialog', { name: 'Beef curry' })
		.getByRole('button', { name: 'Edit recipe' })
		.click();
	const editSheet = page.getByRole('dialog', { name: 'Edit recipe' });
	await expect(editSheet.getByLabel('Recipe name')).toHaveValue('Beef curry');
	await editSheet.getByLabel('Cooked weight of the whole recipe (g)').fill('1000');
	await editSheet.getByRole('button', { name: 'Save changes' }).click();
	await expect(editSheet).toBeHidden();
	await expect(page.getByRole('dialog')).toHaveCount(0); // an edit doesn't reopen the log sheet
	await expect(entry).toBeVisible();
	await page.getByLabel('Search foods').fill('curry');
	await expect(page.getByText('Recipe · 122 kcal per 100 g')).toBeVisible();

	await context.setOffline(false);
});
