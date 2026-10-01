// Body measurements and progress photos (PRD §4.1, ROADMAP Phase 1). Metric storage (CLAUDE.md).

export const POSES = ['Front', 'Side', 'Back'] as const; // v3's photo angles
export type Pose = (typeof POSES)[number];

export type MeasureForm = {
	date: string;
	weight_kg: string;
	waist_cm: string;
	chest_cm: string;
	arm_cm: string;
	thigh_cm: string;
	notes: string;
};
export type MeasureErrors = Partial<Record<keyof MeasureForm | 'form', string>>;
export type Measurement = {
	weight_kg: number | null;
	waist_cm: number | null;
	chest_cm: number | null;
	arm_cm: number | null;
	thigh_cm: number | null;
	notes: string | null;
};

const LIMITS: Record<Exclude<keyof MeasureForm, 'date' | 'notes'>, [number, number, string]> = {
	weight_kg: [20, 400, 'kg'],
	waist_cm: [30, 300, 'cm'],
	chest_cm: [30, 300, 'cm'],
	arm_cm: [10, 100, 'cm'],
	thigh_cm: [20, 150, 'cm']
};

const parse = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

/** Any subset of fields; at least one measurement or a note. Dates can't be in the future. */
export function validateMeasure(f: MeasureForm, today: string): MeasureErrors {
	const e: MeasureErrors = {};
	if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) e.date = 'Choose a date.';
	else if (f.date > today) e.date = 'The date can’t be in the future.';
	for (const [k, [min, max, unit]] of Object.entries(LIMITS) as [
		keyof typeof LIMITS,
		[number, number, string]
	][]) {
		const v = parse(f[k]);
		if (v !== null && !(v >= min && v <= max))
			e[k] = `Enter a number from ${min} to ${max} ${unit}.`;
	}
	if (f.notes.length > 500) e.notes = 'Keep notes under 500 characters.';
	const m = toMeasurement(f);
	if (!Object.keys(e).length && Object.values(m).every((v) => v === null))
		e.form = 'Enter at least one measurement.';
	return e;
}

export function toMeasurement(f: MeasureForm): Measurement {
	const round = (v: number | null, dp: number) =>
		v === null ? null : Math.round(v * 10 ** dp) / 10 ** dp;
	return {
		weight_kg: round(parse(f.weight_kg), 2),
		waist_cm: round(parse(f.waist_cm), 1),
		chest_cm: round(parse(f.chest_cm), 1),
		arm_cm: round(parse(f.arm_cm), 1),
		thigh_cm: round(parse(f.thigh_cm), 1),
		notes: f.notes.trim() || null
	};
}

/** Live entries, newest date first (one row per date by convention; the newest edit wins). */
export function history<T extends { date: string; up: number; deleted?: boolean }>(rows: T[]): T[] {
	const byDate = new Map<string, T>();
	for (const r of rows) {
		if (r.deleted) continue;
		const cur = byDate.get(r.date);
		if (!cur || r.up > cur.up) byDate.set(r.date, r);
	}
	return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Photos grouped by date, newest first. */
export function photosByDate<T extends { taken_on: string; deleted?: boolean }>(
	rows: T[]
): [string, T[]][] {
	const groups = new Map<string, T[]>();
	for (const r of rows) {
		if (r.deleted) continue;
		groups.set(r.taken_on, [...(groups.get(r.taken_on) ?? []), r]);
	}
	return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Fit an image inside max×max, keeping its aspect ratio (v3 compressImage). */
export function fitWithin(w: number, h: number, max = 1280): { w: number; h: number } {
	if (w > h && w > max) return { w: max, h: Math.round((h * max) / w) };
	if (h > max) return { w: Math.round((w * max) / h), h: max };
	return { w, h };
}
