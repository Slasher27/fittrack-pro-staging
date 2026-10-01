import { describe, expect, it } from 'vitest';
import {
	currentTarget,
	macroKcal,
	nutritionTargets,
	validateTargets,
	type TargetsProfile
} from '$lib/domain/targets';

// Expected outputs were computed by running v3's nutritionTargets() (FitTrack-app app/onboard.js)
// on the same inputs on 2026-10-01. The first case is v3's own onboarding test (tests/onboard-test.js).
const ORACLE: [string, TargetsProfile, ReturnType<typeof nutritionTargets>][] = [
	[
		'v3 onboarding test',
		{
			weightKg: 83,
			heightCm: 180,
			age: 45,
			sex: 'male',
			lifestyle: { activity: 'moderate' },
			goal: { type: 'recomp', goalBodyFat: 15 },
			bodyFat: 22
		},
		{
			bmr: 1735,
			tdee: 2516,
			kcal: 2220,
			protein: 183,
			carbs: 203,
			fat: 75,
			kcalTrain: 2370,
			goalWeight: 76
		}
	],
	[
		'defaults (empty profile)',
		{},
		{
			bmr: 1699,
			tdee: 2464,
			kcal: 2160,
			protein: 176,
			carbs: 202,
			fat: 72,
			kcalTrain: 2310,
			goalWeight: null
		}
	],
	[
		'female fat loss, low activity',
		{
			weightKg: 68,
			heightCm: 165,
			age: 34,
			sex: 'female',
			lifestyle: { activity: 'low' },
			goal: { type: 'fatloss' }
		},
		{
			bmr: 1380,
			tdee: 1794,
			kcal: 1400,
			protein: 150,
			carbs: 80,
			fat: 61,
			kcalTrain: 1550,
			goalWeight: null
		}
	],
	[
		'muscle, very active',
		{
			weightKg: 72,
			heightCm: 178,
			age: 24,
			sex: 'male',
			lifestyle: { activity: 'very' },
			goal: { type: 'muscle' }
		},
		{
			bmr: 1718,
			tdee: 3007,
			kcal: 3210,
			protein: 158,
			carbs: 498,
			fat: 65,
			kcalTrain: null,
			goalWeight: null
		}
	],
	[
		'strength, active, explicit goal weight',
		{
			weightKg: 95,
			heightCm: 185,
			age: 38,
			sex: 'male',
			lifestyle: { activity: 'active' },
			goal: { type: 'strength', goalWeight: 90 }
		},
		{
			bmr: 1921,
			tdee: 3074,
			kcal: 3070,
			protein: 209,
			carbs: 365,
			fat: 86,
			kcalTrain: null,
			goalWeight: 90
		}
	],
	[
		'health, unknown activity → moderate',
		{
			weightKg: 60,
			heightCm: 160,
			age: 60,
			sex: 'female',
			lifestyle: { activity: 'couch' },
			goal: { type: 'health' }
		},
		{
			bmr: 1139,
			tdee: 1652,
			kcal: 1650,
			protein: 132,
			carbs: 159,
			fat: 54,
			kcalTrain: null,
			goalWeight: null
		}
	],
	[
		'unknown goal → −300, 1400 kcal floor',
		{
			weightKg: 45,
			heightCm: 150,
			age: 70,
			sex: 'female',
			lifestyle: { activity: 'low' },
			goal: { type: 'zen' }
		},
		{
			bmr: 877,
			tdee: 1140,
			kcal: 1400,
			protein: 99,
			carbs: 159,
			fat: 41,
			kcalTrain: null,
			goalWeight: null
		}
	],
	[
		'80 g carbs floor',
		{
			weightKg: 140,
			heightCm: 160,
			age: 70,
			sex: 'female',
			lifestyle: { activity: 'low' },
			goal: { type: 'fatloss' }
		},
		{
			bmr: 1889,
			tdee: 2456,
			kcal: 1960,
			protein: 308,
			carbs: 80,
			fat: 126,
			kcalTrain: 2110,
			goalWeight: null
		}
	],
	[
		'string inputs from v3 forms',
		{ weightKg: '83', heightCm: '180', age: '45', goal: { type: 'recomp', goalWeight: '78' } },
		{
			bmr: 1735,
			tdee: 2516,
			kcal: 2220,
			protein: 183,
			carbs: 203,
			fat: 75,
			kcalTrain: 2370,
			goalWeight: 78
		}
	]
];

describe('nutritionTargets (exact v3 port)', () => {
	it.each(ORACLE)('%s', (_name, profile, expected) => {
		expect(nutritionTargets(profile)).toEqual(expected);
	});

	it('meets v3 onboarding test ranges', () => {
		const t = nutritionTargets(ORACLE[0][1]);
		expect(t.kcal).toBeGreaterThanOrEqual(1900);
		expect(t.kcal).toBeLessThanOrEqual(2400);
		expect(t.kcalTrain).toBe(t.kcal + 150);
		expect(Math.abs(t.goalWeight! - 76)).toBeLessThanOrEqual(1.5);
	});
});

describe('currentTarget', () => {
	const rows = [
		{ id: 'a', effective_from: '2026-09-01', up: 1 },
		{ id: 'b', effective_from: '2026-10-01', up: 5 },
		{ id: 'c', effective_from: '2026-10-01', up: 9 },
		{ id: 'd', effective_from: '2026-10-05', up: 2 },
		{ id: 'e', effective_from: '2026-10-02', up: 99, deleted: true }
	];

	it('takes the latest effective date on or before the day, ties by larger up', () => {
		expect(currentTarget(rows, '2026-10-03')?.id).toBe('c');
		expect(currentTarget(rows, '2026-10-05')?.id).toBe('d');
		expect(currentTarget(rows, '2026-09-15')?.id).toBe('a');
	});

	it('ignores deleted rows and returns nothing before the first target', () => {
		expect(currentTarget(rows, '2026-08-01')).toBeUndefined();
		expect(currentTarget([rows[4]], '2026-10-03')).toBeUndefined();
	});
});

describe('validateTargets', () => {
	const ok = {
		kcal: 2100,
		kcal_train: null,
		protein_g: 176,
		carbs_g: 210,
		fat_g: 72,
		water_ml: 3000
	};

	it('accepts sane targets, with or without training-day calories', () => {
		expect(validateTargets(ok)).toEqual({});
		expect(validateTargets({ ...ok, kcal_train: 2250 })).toEqual({});
	});

	it('uses the database limits', () => {
		const e = validateTargets({
			...ok,
			kcal: 700,
			protein_g: 1001,
			water_ml: 2.5,
			kcal_train: 20000
		});
		expect(Object.keys(e).sort()).toEqual(['kcal', 'kcal_train', 'protein_g', 'water_ml']);
		expect(e.kcal).toBe('Enter a whole number from 800 to 10000 kcal.');
	});

	it('adds up macro calories', () => {
		expect(macroKcal(ok)).toBe(176 * 4 + 210 * 4 + 72 * 9);
	});
});
