import { describe, expect, it } from 'vitest';
import {
	defaultAmount,
	foodFromForm,
	foodSummary,
	gramsFor,
	nutrientsFor,
	searchFoods,
	validateFoodForm,
	type FoodForm,
	type FoodLike
} from '$lib/domain/food';

const rice: FoodLike = {
	id: 'rice',
	name: 'White rice, cooked',
	per100: { kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 },
	servings: []
};
const egg: FoodLike = {
	id: 'egg',
	name: 'Egg, boiled',
	per100: null,
	servings: [{ label: '1 egg', grams: null, kcal: 70, protein_g: 6, carbs_g: 0.5, fat_g: 5 }]
};
const bread: FoodLike = {
	id: 'bread',
	name: 'Seed bread',
	per100: { kcal: 250, protein_g: 11, carbs_g: 41, fat_g: 4.2 },
	servings: [{ label: '1 slice', grams: 36 }]
};
const milk: FoodLike = {
	id: 'milk',
	name: 'Milk, low fat',
	brand: 'Clover',
	per100: { kcal: 46, protein_g: 3.4, carbs_g: 4.8, fat_g: 1.5, unit: 'ml' },
	servings: []
};

describe('nutrientsFor', () => {
	it('scales per-100 values by weight', () => {
		expect(nutrientsFor(rice, { grams: 180 })).toEqual({
			kcal: 234,
			protein_g: 4.9,
			carbs_g: 50.4,
			fat_g: 0.5
		});
	});

	it('uses a count serving’s own nutrition', () => {
		expect(nutrientsFor(egg, { servings: 2, label: '1 egg' })).toEqual({
			kcal: 140,
			protein_g: 12,
			carbs_g: 1,
			fat_g: 10
		});
	});

	it('converts a weighed serving through per-100 values', () => {
		expect(nutrientsFor(bread, { servings: 2, label: '1 slice' })).toEqual({
			kcal: 180,
			protein_g: 7.9,
			carbs_g: 29.5,
			fat_g: 3
		});
		expect(gramsFor(bread, { servings: 2, label: '1 slice' })).toBe(72);
		expect(gramsFor(egg, { servings: 2, label: '1 egg' })).toBeNull();
	});

	it('returns zeros for an unknown serving or no per-100 data', () => {
		expect(nutrientsFor(egg, { grams: 100 }).kcal).toBe(0);
		expect(nutrientsFor(rice, { servings: 1, label: 'cup' }).kcal).toBe(0);
	});
});

describe('defaults and summaries', () => {
	it('starts count foods at one serving and weight foods at 100 g', () => {
		expect(defaultAmount(egg)).toEqual({ servings: 1, label: '1 egg' });
		expect(defaultAmount(bread)).toEqual({ servings: 1, label: '1 slice' });
		expect(defaultAmount(rice)).toEqual({ grams: 100 });
	});

	it('summarises in the food’s own unit', () => {
		expect(foodSummary(rice)).toBe('130 kcal per 100 g');
		expect(foodSummary(milk)).toBe('46 kcal per 100 ml');
		expect(foodSummary(egg)).toBe('70 kcal per 1 egg');
	});
});

describe('searchFoods', () => {
	const foods = [
		rice,
		egg,
		bread,
		milk,
		{ ...rice, id: 'rice-brown', name: 'Brown rice, cooked' },
		{ ...rice, id: 'crispies', name: 'Rice crispies' },
		{ ...rice, id: 'gone', name: 'Rice cakes', deleted: true }
	];

	it('matches every word in name or brand, ignoring case and accents', () => {
		expect(searchFoods(foods, 'CLOVER milk').map((f) => f.id)).toEqual(['milk']);
		expect(
			searchFoods(foods, 'rice cooked')
				.map((f) => f.id)
				.sort()
		).toEqual(['rice', 'rice-brown']);
		expect(searchFoods(foods, 'ríce').length).toBe(3);
		expect(searchFoods(foods, '  ')).toEqual([]);
	});

	it('ranks name prefix, then word prefix, then recently used', () => {
		// "White rice, cooked" and "Brown rice, cooked" tie on everything else, so list order holds…
		expect(searchFoods(foods, 'rice').map((f) => f.id)).toEqual(['crispies', 'rice', 'rice-brown']);
		// …until one was used recently.
		expect(searchFoods(foods, 'rice', ['rice-brown']).map((f) => f.id)).toEqual([
			'crispies',
			'rice-brown',
			'rice'
		]);
	});
});

describe('custom food form', () => {
	const base: FoodForm = {
		name: 'Ouma rusks',
		brand: '',
		basis: 'serving',
		servingLabel: '1 rusk',
		servingGrams: '35',
		kcal: '154',
		protein_g: '3',
		carbs_g: '24',
		fat_g: '5'
	};

	it('validates', () => {
		expect(validateFoodForm(base)).toEqual({});
		const e = validateFoodForm({
			...base,
			name: '',
			servingLabel: '',
			kcal: '',
			protein_g: '-1',
			servingGrams: '0'
		});
		expect(Object.keys(e).sort()).toEqual([
			'kcal',
			'name',
			'protein_g',
			'servingGrams',
			'servingLabel'
		]);
	});

	it('builds a weighed serving with per-100 g values too', () => {
		const f = foodFromForm(base);
		expect(f.servings).toEqual([
			{ label: '1 rusk', grams: 35, kcal: 154, protein_g: 3, carbs_g: 24, fat_g: 5 }
		]);
		expect(f.per100).toEqual({ kcal: 440, protein_g: 8.6, carbs_g: 68.6, fat_g: 14.3, unit: 'g' });
	});

	it('builds a count-only serving, or per-100 ml for drinks', () => {
		expect(foodFromForm({ ...base, servingGrams: '' }).per100).toBeNull();
		expect(foodFromForm({ ...base, basis: 'ml', protein_g: '' })).toEqual({
			per100: { kcal: 154, protein_g: 0, carbs_g: 24, fat_g: 5, unit: 'ml' },
			servings: []
		});
	});
});
