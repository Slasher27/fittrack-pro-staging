// Nutrition writes shared by Today and Nutrition. All local-first through the repositories.
import type { LocalDb } from './db';
import { put } from './repo';
import type { LocalRow } from './tables';
import type { MealSlot } from '$lib/domain/day';
import {
	foodFromForm,
	gramsFor,
	nutrientsFor,
	type Amount,
	type FoodForm,
	type FoodLike,
	type Ingredient,
	type Per100
} from '$lib/domain/food';

export type FoodRow = LocalRow<'foods'>;
export type FoodLogRow = LocalRow<'food_logs'>;

/** A foods row as the domain sees it (jsonb columns typed). */
export const asFood = (f: FoodRow) => f as unknown as FoodLike & FoodRow;

/** Log an amount of a food: nutrients are snapshotted so later food edits never rewrite history. */
export function logFood(
	db: LocalDb,
	userId: string,
	food: FoodRow,
	amount: Amount,
	slot: MealSlot,
	eatenAt: string,
	existing?: FoodLogRow
) {
	const f = asFood(food);
	return put(db, 'food_logs', {
		...(existing ?? { id: crypto.randomUUID(), estimated: false, deleted: false }),
		user_id: userId,
		food_id: food.id,
		name: food.name,
		eaten_at: eatenAt,
		meal_slot: slot,
		grams: gramsFor(f, amount),
		servings: 'servings' in amount ? amount.servings : null,
		serving_label: 'servings' in amount ? amount.label : null,
		...nutrientsFor(f, amount),
		up: 0
	});
}

/** Log the same thing again (Today's "Log again", Nutrition's recent chips). */
export function relog(db: LocalDb, log: FoodLogRow, slot: MealSlot, eatenAt: string) {
	return put(db, 'food_logs', {
		...log,
		id: crypto.randomUUID(),
		eaten_at: eatenAt,
		meal_slot: slot,
		up: 0,
		deleted: false
	});
}

/** Create or update one of the member's own foods from the custom-food form. */
export function saveFood(db: LocalDb, userId: string, form: FoodForm, existing?: FoodRow) {
	return put(db, 'foods', {
		...(existing ?? {
			id: crypto.randomUUID(),
			kind: 'food',
			barcode: null,
			group_name: null,
			ingredients: null,
			cooked_g: null,
			deleted: false
		}),
		owner_id: userId,
		source: 'user',
		name: form.name.trim(),
		brand: form.brand.trim() || null,
		...(foodFromForm(form) as Pick<FoodRow, 'per100' | 'servings'>),
		up: 0
	});
}

/** Create or update a recipe: stored as one of the member's foods, per 100 g cooked. */
export function saveRecipe(
	db: LocalDb,
	userId: string,
	recipe: { name: string; ingredients: Ingredient[]; cookedG: number; per100: Per100 },
	existing?: FoodRow
) {
	return put(db, 'foods', {
		...(existing ?? {
			id: crypto.randomUUID(),
			brand: null,
			barcode: null,
			group_name: null,
			deleted: false
		}),
		owner_id: userId,
		kind: 'recipe',
		source: 'user',
		name: recipe.name.trim(),
		per100: recipe.per100,
		servings: [],
		ingredients: recipe.ingredients,
		cooked_g: recipe.cookedG,
		up: 0
	} as FoodRow);
}
