// Nutrition targets. `nutritionTargets` is an exact port of v3 app/onboard.js (ARCHITECTURE §6);
// its outputs are pinned against the v3 function in tests/unit/domain/targets.test.ts.

/** The v3 profile keys the formula reads (profiles.questionnaire keeps them). Numbers may be strings from forms. */
export type TargetsProfile = {
	weightKg?: number | string;
	heightCm?: number | string;
	age?: number | string;
	sex?: string;
	bodyFat?: number | string;
	lifestyle?: { activity?: string };
	goal?: { type?: string; goalWeight?: number | string; goalBodyFat?: number | string };
};

export type NutritionTargets = {
	bmr: number;
	tdee: number;
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	kcalTrain: number | null;
	goalWeight: number | null;
};

const ACTIVITY: Record<string, number> = { low: 1.3, moderate: 1.45, active: 1.6, very: 1.75 };
const GOAL_DELTA: Record<string, number> = {
	fatloss: -500,
	recomp: -300,
	health: 0,
	strength: 0,
	muscle: 200
};

/** v3 `+x || fallback`: missing, zero or non-numeric values fall back. */
const num = (v: unknown, fallback: number) => Number(v) || fallback;

export function nutritionTargets(p: TargetsProfile): NutritionTargets {
	const w = num(p.weightKg, 80);
	const h = num(p.heightCm, 175);
	const a = num(p.age, 40);
	const male = (p.sex || 'male') !== 'female';
	const bmr = Math.round(10 * w + 6.25 * h - 5 * a + (male ? 5 : -161)); // Mifflin-St Jeor
	const tdee = Math.round(bmr * (ACTIVITY[p.lifestyle?.activity || 'moderate'] || 1.45));
	const goal = p.goal?.type || 'recomp';
	const kcal = Math.max(1400, Math.round((tdee + (GOAL_DELTA[goal] ?? -300)) / 10) * 10);
	const protein = Math.round(2.2 * w);
	const fat = Math.round(0.9 * w);
	const carbs = Math.max(80, Math.round((kcal - protein * 4 - fat * 9) / 4));
	const kcalTrain = goal === 'recomp' || goal === 'fatloss' ? kcal + 150 : null;

	let goalWeight = p.goal?.goalWeight ? Number(p.goal.goalWeight) : null;
	const bodyFat = Number(p.bodyFat);
	const goalBodyFat = Number(p.goal?.goalBodyFat);
	if (!goalWeight && bodyFat && goalBodyFat) {
		const lean = w * (1 - bodyFat / 100);
		goalWeight = Math.round((lean / (1 - goalBodyFat / 100)) * 2) / 2; // nearest 0.5 kg
	}
	return { bmr, tdee, kcal, protein, carbs, fat, kcalTrain, goalWeight };
}

/** The targets in force on a date: the latest effective_from ≤ date, ties broken by the larger `up`. */
export function currentTarget<T extends { effective_from: string; up: number; deleted?: boolean }>(
	rows: T[],
	date: string
): T | undefined {
	let best: T | undefined;
	for (const r of rows) {
		if (r.deleted || r.effective_from > date) continue;
		if (
			!best ||
			r.effective_from > best.effective_from ||
			(r.effective_from === best.effective_from && r.up > best.up)
		)
			best = r;
	}
	return best;
}

export type TargetsInput = {
	kcal: number;
	kcal_train: number | null;
	protein_g: number;
	carbs_g: number;
	fat_g: number;
	water_ml: number;
};
export type TargetsErrors = Partial<Record<keyof TargetsInput, string>>;

// Same limits as the checks in supabase/migrations/0008_targets.sql, so a valid form is never rejected.
const LIMITS: Record<keyof TargetsInput, [number, number, string]> = {
	kcal: [800, 10000, 'kcal'],
	kcal_train: [800, 10000, 'kcal'],
	protein_g: [0, 1000, 'g'],
	carbs_g: [0, 2000, 'g'],
	fat_g: [0, 1000, 'g'],
	water_ml: [0, 10000, 'ml']
};

export function validateTargets(t: TargetsInput): TargetsErrors {
	const errors: TargetsErrors = {};
	for (const key of Object.keys(LIMITS) as (keyof TargetsInput)[]) {
		const v = t[key];
		if (v === null && key === 'kcal_train') continue;
		const [min, max, unit] = LIMITS[key];
		if (v === null || !Number.isInteger(v) || v < min || v > max)
			errors[key] = `Enter a whole number from ${min} to ${max} ${unit}.`;
	}
	return errors;
}

/** kcal implied by macros (4/4/9), to show next to the calorie target. */
export const macroKcal = (t: Pick<TargetsInput, 'protein_g' | 'carbs_g' | 'fat_g'>) =>
	t.protein_g * 4 + t.carbs_g * 4 + t.fat_g * 9;
