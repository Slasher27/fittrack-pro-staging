// Gym profiles and their equipment (PRD §4.1, ARCHITECTURE §6). Replaces v3's hasEquip() regex
// matching with explicit capability tokens. Weights are kg (CLAUDE.md: store metric).
import { CAPABILITIES, type Capability } from './capabilities';
import type { WeightKind } from './catalog';

export type Range = { min: number; max: number; step: number };
export type Weights = Range | number[] | null;

export const GYM_KINDS = [
	{ value: 'home', label: 'Home' },
	{ value: 'commercial', label: 'Commercial' },
	{ value: 'park', label: 'Park' },
	{ value: 'travel', label: 'Travel' },
	{ value: 'other', label: 'Other' }
] as const;
export type GymKind = (typeof GYM_KINDS)[number]['value'];

/** A commercial gym starts as "full equipment" (v3: commercial → everything, D-040). */
export const assumeFullFor = (kind: GymKind) => kind === 'commercial';

/** Everything a gym lets you do. Full equipment = every capability; deleted items count for nothing. */
export function capabilities(
	gym: { assume_full: boolean },
	items: { capabilities: string[]; deleted?: boolean }[]
): Set<Capability> {
	if (gym.assume_full) return new Set(CAPABILITIES);
	const caps = new Set<Capability>();
	for (const item of items) {
		if (item.deleted) continue;
		for (const c of item.capabilities)
			if ((CAPABILITIES as readonly string[]).includes(c)) caps.add(c as Capability);
	}
	return caps;
}

/** Starting weights when an item is ticked (the member edits them). Items not listed have none. */
export const DEFAULT_WEIGHTS: Record<string, Weights> = {
	'dumbbells-adjustable': { min: 2, max: 32, step: 2 },
	'dumbbells-fixed': [4, 6, 8, 10, 12, 14, 16, 18, 20],
	kettlebells: [12, 16, 24],
	'barbell-olympic': [20],
	'barbell-standard': [10],
	'ez-bar': [10],
	'trap-bar': [25],
	plates: [1.25, 2.5, 5, 10, 15, 20, 25],
	'med-ball': [4, 6, 8]
};

const MAX_KG = 500;
const isKg = (n: unknown): n is number => typeof n === 'number' && n > 0 && n <= MAX_KG;

/** Same rules as the server (migration 0011). Returns an error message, or null when valid. */
export function validateWeights(kind: WeightKind | null, w: Weights): string | null {
	if (w === null) return null;
	if (kind === null || kind === 'none') return 'This item has no weights.';
	if (kind === 'range') {
		if (Array.isArray(w)) return 'Enter a range.';
		const { min, max, step } = w;
		if (!isKg(min) || !isKg(max)) return `Enter weights from 0 to ${MAX_KG} kg.`;
		if (min > max) return 'The lightest weight must not be more than the heaviest.';
		if (!isKg(step)) return 'Enter a step greater than 0.';
		if (step > max) return 'The step can’t be more than the heaviest weight.';
		return null;
	}
	if (!Array.isArray(w) || !w.length) return 'Add at least one weight.';
	if (w.length > 40) return 'Add at most 40 weights.';
	if (!w.every(isKg)) return `Enter weights from 0 to ${MAX_KG} kg.`;
	return null;
}

/** "12,5" or "12.5" → 12.5; anything else → null. */
export function parseKg(text: string): number | null {
	const t = text.trim().replace(',', '.');
	if (!/^\d+(\.\d+)?$/.test(t)) return null;
	const n = Math.round(Number(t) * 100) / 100;
	return isKg(n) ? n : null;
}

/** Add a weight to a list: sorted, no duplicates. */
export const addWeight = (list: number[], kg: number) =>
	[...new Set([...list, kg])].sort((a, b) => a - b);

const kg = (n: number) => String(n);

/** "2 – 32 kg · 2 kg steps", "12, 16, 24 kg", or "" when there are none. */
export function weightsLabel(w: Weights): string {
	if (w === null) return '';
	if (Array.isArray(w)) return w.length ? `${w.map(kg).join(', ')} kg` : '';
	return `${kg(w.min)} – ${kg(w.max)} kg · ${kg(w.step)} kg steps`;
}

export function validateGymName(name: string): string | null {
	const n = name.trim();
	if (!n) return 'Give this gym a name.';
	if (n.length > 60) return 'Keep the name under 60 characters.';
	return null;
}

export function validateCustom(name: string, caps: string[]): { name?: string; caps?: string } {
	const e: { name?: string; caps?: string } = {};
	const n = name.trim();
	if (!n) e.name = 'Name this equipment.';
	else if (n.length > 60) e.name = 'Keep the name under 60 characters.';
	if (!caps.length) e.caps = 'Choose at least one thing it counts as, so workouts can use it.';
	return e;
}

/**
 * Live gyms in display order: the default first, then by name. Two devices can each create a
 * default before they sync (no unique constraints on synced tables), so the newest-edited wins.
 */
export function orderGyms<
	T extends { name: string; is_default: boolean; up: number; deleted?: boolean }
>(gyms: T[]): T[] {
	const live = gyms.filter((g) => !g.deleted);
	const def = live.filter((g) => g.is_default).sort((a, b) => b.up - a.up)[0];
	const rest = live.filter((g) => g !== def).sort((a, b) => a.name.localeCompare(b.name));
	return def ? [def, ...rest] : rest;
}
