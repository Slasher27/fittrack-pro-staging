import { describe, expect, it } from 'vitest';
import {
	amountLabel,
	dayRange,
	dayTotals,
	eatenAt,
	greeting,
	localMidnight,
	mealSlotAt,
	recentFoods,
	type FoodLogLike
} from '$lib/domain/day';

describe('local days', () => {
	it('starts a Johannesburg day at 22:00 UTC the evening before', () => {
		expect(new Date(localMidnight('2026-10-01')).toISOString()).toBe('2026-09-30T22:00:00.000Z');
		expect(dayRange('2026-10-01')).toEqual([
			'2026-09-30T22:00:00.000Z',
			'2026-10-01T22:00:00.000Z'
		]);
	});

	it('handles a timezone with DST (London, clocks go back 25 Oct 2026)', () => {
		expect(dayRange('2026-10-25', 'Europe/London')).toEqual([
			'2026-10-24T23:00:00.000Z',
			'2026-10-26T00:00:00.000Z'
		]);
	});

	it('crosses month and year ends', () => {
		expect(dayRange('2026-12-31')[1]).toBe('2026-12-31T22:00:00.000Z');
	});
});

describe('meal slots and greeting (local time)', () => {
	const at = (utc: string) => new Date(utc);
	it('picks the slot from the local hour', () => {
		expect(mealSlotAt(at('2026-10-01T06:00:00Z'))).toBe('breakfast'); // 08:00 SAST
		expect(mealSlotAt(at('2026-10-01T10:30:00Z'))).toBe('lunch'); // 12:30
		expect(mealSlotAt(at('2026-10-01T13:30:00Z'))).toBe('snack'); // 15:30
		expect(mealSlotAt(at('2026-10-01T17:00:00Z'))).toBe('dinner'); // 19:00
	});

	it('greets by local time', () => {
		expect(greeting(at('2026-10-01T05:00:00Z'))).toBe('Good morning');
		expect(greeting(at('2026-10-01T12:00:00Z'))).toBe('Good afternoon');
		expect(greeting(at('2026-10-01T18:00:00Z'))).toBe('Good evening');
	});
});

const log = (o: Partial<FoodLogLike>): FoodLogLike => ({
	id: crypto.randomUUID(),
	eaten_at: '2026-10-01T06:00:00.000Z',
	food_id: null,
	name: 'Oats',
	grams: 80,
	servings: null,
	serving_label: null,
	kcal: 300,
	protein_g: 10,
	carbs_g: 54,
	fat_g: 6,
	...o
});

describe('dayTotals', () => {
	it('sums live logs, ignoring deleted ones, and accepts numeric strings', () => {
		const t = dayTotals([
			log({}),
			log({ kcal: '120.5' as unknown as number }),
			log({ deleted: true })
		]);
		expect(t).toEqual({ kcal: 420.5, protein_g: 20, carbs_g: 108, fat_g: 12 });
	});
});

describe('recentFoods', () => {
	it('lists distinct food + amount pairs, newest first, skipping deleted', () => {
		const logs = [
			log({ name: 'Oats', eaten_at: '2026-09-30T06:00:00.000Z' }),
			log({ name: 'Oats', eaten_at: '2026-10-01T06:00:00.000Z' }),
			log({ name: 'oats', grams: 40, eaten_at: '2026-09-29T06:00:00.000Z' }),
			log({
				name: 'Banana',
				grams: null,
				servings: 1,
				serving_label: 'medium',
				eaten_at: '2026-10-01T07:00:00.000Z'
			}),
			log({ name: 'Chips', eaten_at: '2026-10-01T08:00:00.000Z', deleted: true })
		];
		expect(recentFoods(logs).map((l) => `${l.name} ${amountLabel(l)}`)).toEqual([
			'Banana 1 medium',
			'Oats 80 g',
			'oats 40 g'
		]);
	});

	it('limits the list', () => {
		const logs = Array.from({ length: 10 }, (_, i) => log({ name: `Food ${i}` }));
		expect(recentFoods(logs, 3)).toHaveLength(3);
	});
});

describe('amountLabel', () => {
	it('reads naturally', () => {
		expect(amountLabel({ grams: 80, servings: null, serving_label: null })).toBe('80 g');
		expect(amountLabel({ grams: null, servings: 2, serving_label: 'slices' })).toBe('2 slices');
		expect(amountLabel({ grams: null, servings: 1, serving_label: null })).toBe('1 serving');
		expect(amountLabel({ grams: null, servings: 1, serving_label: '1 rusk' })).toBe('1 rusk');
		expect(amountLabel({ grams: null, servings: 2, serving_label: '1 rusk' })).toBe('2 × 1 rusk');
		expect(amountLabel({ grams: null, servings: 1.5, serving_label: '40 g' })).toBe('1.5 × 40 g');
	});
});

describe('eatenAt', () => {
	const now = new Date('2026-10-01T10:15:00Z'); // 12:15 in Johannesburg
	it('is now for today, and the slot time on other days', () => {
		expect(eatenAt('2026-10-01', 'dinner', now)).toBe('2026-10-01T10:15:00.000Z');
		expect(eatenAt('2026-09-29', 'dinner', now)).toBe('2026-09-29T17:00:00.000Z'); // 19:00 SAST
		expect(eatenAt('2026-09-29', 'breakfast', now)).toBe('2026-09-29T06:00:00.000Z');
	});
});
