// Days, meal slots and daily totals. A "day" is the member's local date in their timezone (CLAUDE.md).
import { DEFAULT_TIMEZONE } from './dates';

/** Offset of `tz` from UTC at instant `ms`, in ms (e.g. +2 h for Africa/Johannesburg). */
function tzOffset(ms: number, tz: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	}).formatToParts(new Date(ms));
	const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
	const asUtc = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour'),
		get('minute'),
		get('second')
	);
	return asUtc - Math.floor(ms / 1000) * 1000;
}

/** The UTC instant of local midnight starting `date` ('YYYY-MM-DD') in `tz`. */
export function localMidnight(date: string, tz = DEFAULT_TIMEZONE): number {
	const [y, m, d] = date.split('-').map(Number);
	const guess = Date.UTC(y, m - 1, d);
	const first = guess - tzOffset(guess, tz);
	return guess - tzOffset(first, tz); // second pass settles DST changes
}

/** [start, end) of a local day as ISO strings, for ranges over `…Z` timestamps. */
export function dayRange(date: string, tz = DEFAULT_TIMEZONE): [string, string] {
	const [y, m, d] = date.split('-').map(Number);
	const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
	return [
		new Date(localMidnight(date, tz)).toISOString(),
		new Date(localMidnight(next, tz)).toISOString()
	];
}

/** Local hour (0–23) of an instant. */
export function localHour(instant: Date, tz = DEFAULT_TIMEZONE): number {
	return Number(
		new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', hour: 'numeric' }).format(
			instant
		)
	);
}

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

/** The slot a log made now most likely belongs to (v3's default times: 08, 13, 16, 19). */
export function mealSlotAt(instant: Date, tz = DEFAULT_TIMEZONE): MealSlot {
	const h = localHour(instant, tz);
	if (h < 11) return 'breakfast';
	if (h < 15) return 'lunch';
	if (h < 17) return 'snack';
	return 'dinner';
}

export function greeting(instant: Date, tz = DEFAULT_TIMEZONE): string {
	const h = localHour(instant, tz);
	return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export function dayTotals(logs: (Macros & { deleted?: boolean })[]): Macros {
	const t = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
	for (const l of logs) {
		if (l.deleted) continue;
		t.kcal += Number(l.kcal);
		t.protein_g += Number(l.protein_g);
		t.carbs_g += Number(l.carbs_g);
		t.fat_g += Number(l.fat_g);
	}
	return t;
}

export type FoodLogLike = Macros & {
	id: string;
	eaten_at: string;
	food_id: string | null;
	name: string;
	grams: number | null;
	servings: number | null;
	serving_label: string | null;
	deleted?: boolean;
};

/** The member's most recent distinct foods (same food + same amount), newest first. */
export function recentFoods<T extends FoodLogLike>(logs: T[], n = 6): T[] {
	const seen = new Set<string>();
	const out: T[] = [];
	for (const l of [...logs].sort((a, b) => b.eaten_at.localeCompare(a.eaten_at))) {
		if (l.deleted) continue;
		const key = `${l.food_id ?? l.name.toLowerCase()}|${l.grams ?? ''}|${l.servings ?? ''}|${l.serving_label ?? ''}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(l);
		if (out.length === n) break;
	}
	return out;
}

/** "80 g", "2 slices", "1 serving". */
export function amountLabel(l: Pick<FoodLogLike, 'grams' | 'servings' | 'serving_label'>): string {
	if (l.servings != null) {
		const n = Number(l.servings);
		return `${n} ${l.serving_label || (n === 1 ? 'serving' : 'servings')}`;
	}
	return `${Number(l.grams)} g`;
}
