// Food maths and search. Foods store nutrition per 100 g (or 100 ml, per100.unit) and/or named
// servings (ARCHITECTURE §3, D-037). A count serving ("1 egg") may carry grams, or its own macros.

export type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
export type Per100 = Macros & { unit?: 'g' | 'ml' };
export type Serving = { label: string; grams: number | null } & Partial<Macros>;
export type FoodLike = {
	id: string;
	name: string;
	brand?: string | null;
	per100: Per100 | null;
	servings: Serving[];
	deleted?: boolean;
};

/** How much was eaten: a weight/volume, or a number of one named serving. */
export type Amount = { grams: number } | { servings: number; label: string };

const ZERO: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
const round1 = (n: number) => Math.round(n * 10) / 10;
const scale = (m: Partial<Macros>, k: number): Macros => ({
	kcal: round1((m.kcal ?? 0) * k),
	protein_g: round1((m.protein_g ?? 0) * k),
	carbs_g: round1((m.carbs_g ?? 0) * k),
	fat_g: round1((m.fat_g ?? 0) * k)
});

export const unitOf = (f: Pick<FoodLike, 'per100'>) => f.per100?.unit ?? 'g';

/** Nutrients for an amount of a food (snapshotted into food_logs at log time). */
export function nutrientsFor(food: FoodLike, amount: Amount): Macros {
	if ('grams' in amount) return food.per100 ? scale(food.per100, amount.grams / 100) : { ...ZERO };
	const s = food.servings.find((x) => x.label === amount.label);
	if (!s) return { ...ZERO };
	if (s.kcal !== undefined) return scale(s, amount.servings); // the serving's own nutrition wins
	if (food.per100 && s.grams) return scale(food.per100, (s.grams * amount.servings) / 100);
	return { ...ZERO };
}

/** The grams an amount weighs, when known (stored on the log for weight-based amounts). */
export function gramsFor(food: FoodLike, amount: Amount): number | null {
	if ('grams' in amount) return amount.grams;
	const s = food.servings.find((x) => x.label === amount.label);
	return s?.grams ? round1(s.grams * amount.servings) : null;
}

/** A sensible first amount: the first count serving × 1, else 100 g/ml. */
export function defaultAmount(food: FoodLike): Amount {
	const s = food.servings[0];
	if (s && (s.kcal !== undefined || s.grams)) return { servings: 1, label: s.label };
	return { grams: 100 };
}

/** One-line nutrition summary for search results. */
export function foodSummary(food: FoodLike): string {
	if (food.per100) return `${Math.round(food.per100.kcal)} kcal per 100 ${unitOf(food)}`;
	const s = food.servings[0];
	return s
		? `${Math.round(nutrientsFor(food, { servings: 1, label: s.label }).kcal)} kcal per ${s.label}`
		: '';
}

const norm = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

/**
 * Local search: every query word must appear in the name or brand. Ranked by: name starts with the
 * query, a word starts with it, then recently used foods, then shorter names.
 */
export function searchFoods<T extends FoodLike>(
	foods: T[],
	query: string,
	recentIds: string[] = [],
	limit = 30
): T[] {
	const q = norm(query);
	if (!q) return [];
	const words = q.split(' ');
	const recent = new Map(recentIds.map((id, i) => [id, i]));
	return foods
		.filter((f) => !f.deleted)
		.map((f) => {
			const name = norm(f.name);
			const hay = `${name} ${norm(f.brand ?? '')}`;
			if (!words.every((w) => hay.includes(w))) return null;
			let score = 0;
			if (name.startsWith(q)) score += 100;
			else if (name.split(' ').some((w) => w.startsWith(words[0]))) score += 50;
			if (recent.has(f.id)) score += 40 - Math.min(recent.get(f.id)!, 30);
			score -= name.length / 100;
			return { f, score };
		})
		.filter((x): x is { f: T; score: number } => x !== null)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map((x) => x.f);
}

export type FoodForm = {
	name: string;
	brand: string;
	basis: 'g' | 'ml' | 'serving';
	servingLabel: string;
	servingGrams: string;
	kcal: string;
	protein_g: string;
	carbs_g: string;
	fat_g: string;
};
export type FoodFormErrors = Partial<Record<keyof FoodForm, string>>;

const numOrNaN = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));

export function validateFoodForm(f: FoodForm): FoodFormErrors {
	const e: FoodFormErrors = {};
	if (!f.name.trim()) e.name = 'Enter the food’s name.';
	else if (f.name.trim().length > 120) e.name = 'Use 120 characters or fewer.';
	if (f.basis === 'serving') {
		if (!f.servingLabel.trim()) e.servingLabel = 'Describe one serving, for example “1 egg”.';
		const g = numOrNaN(f.servingGrams);
		if (f.servingGrams.trim() && !(g > 0 && g <= 5000))
			e.servingGrams = 'Enter grams from 1 to 5000, or leave it empty.';
	}
	const kcal = numOrNaN(f.kcal);
	if (!(kcal >= 0 && kcal <= 5000)) e.kcal = 'Enter calories from 0 to 5000.';
	for (const k of ['protein_g', 'carbs_g', 'fat_g'] as const) {
		const v = f[k].trim() === '' ? 0 : numOrNaN(f[k]);
		if (!(v >= 0 && v <= 1000)) e[k] = 'Enter grams from 0 to 1000, or leave it empty.';
	}
	return e;
}

/** The per100 / servings columns for a valid form. */
export function foodFromForm(f: FoodForm): Pick<FoodLike, 'per100' | 'servings'> {
	const m: Macros = {
		kcal: numOrNaN(f.kcal),
		protein_g: f.protein_g.trim() ? numOrNaN(f.protein_g) : 0,
		carbs_g: f.carbs_g.trim() ? numOrNaN(f.carbs_g) : 0,
		fat_g: f.fat_g.trim() ? numOrNaN(f.fat_g) : 0
	};
	if (f.basis !== 'serving') return { per100: { ...m, unit: f.basis }, servings: [] };
	const grams = f.servingGrams.trim() ? numOrNaN(f.servingGrams) : null;
	return {
		// With the serving's weight we also know per-100 g values, so grams work too.
		per100: grams ? { ...scale(m, 100 / grams), unit: 'g' } : null,
		servings: [{ label: f.servingLabel.trim(), grams, ...m }]
	};
}
