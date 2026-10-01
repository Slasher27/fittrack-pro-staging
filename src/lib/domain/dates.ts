// Dates: a "day" is the user's local date (CLAUDE.md). Pure: callers pass `now`.

export const DEFAULT_TIMEZONE = 'Africa/Johannesburg';

/** ISO date ('YYYY-MM-DD') of an instant in a timezone. */
export function localDate(instant: Date, timeZone = DEFAULT_TIMEZONE): string {
	// en-CA formats as YYYY-MM-DD.
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(instant);
}

/** Whole years between an ISO birth date and an ISO date. Null if either is invalid. */
export function ageOn(birthDate: string, onDate: string): number | null {
	const b = parseIsoDate(birthDate);
	const d = parseIsoDate(onDate);
	if (!b || !d || b.y > d.y || (b.y === d.y && (b.m > d.m || (b.m === d.m && b.d > d.d))))
		return null;
	const hadBirthday = d.m > b.m || (d.m === b.m && d.d >= b.d);
	return d.y - b.y - (hadBirthday ? 0 : 1);
}

function parseIsoDate(s: string): { y: number; m: number; d: number } | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) return null;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const date = new Date(Date.UTC(y, mo - 1, d));
	if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d)
		return null;
	return { y, m: mo, d };
}
