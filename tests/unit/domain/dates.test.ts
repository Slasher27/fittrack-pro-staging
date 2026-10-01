import { describe, expect, it } from 'vitest';
import { ageOn, localDate } from '$lib/domain/dates';

describe('localDate', () => {
	it('uses Africa/Johannesburg by default (UTC+2)', () => {
		expect(localDate(new Date('2026-10-01T22:30:00Z'))).toBe('2026-10-02');
		expect(localDate(new Date('2026-10-01T21:59:00Z'))).toBe('2026-10-01');
	});

	it('respects another timezone', () => {
		expect(localDate(new Date('2026-10-01T02:00:00Z'), 'America/New_York')).toBe('2026-09-30');
	});
});

describe('ageOn', () => {
	it('counts a birthday on the day as reached', () => {
		expect(ageOn('2008-10-01', '2026-10-01')).toBe(18);
	});

	it('is one less the day before the birthday', () => {
		expect(ageOn('2008-10-02', '2026-10-01')).toBe(17);
		expect(ageOn('2008-12-31', '2026-10-01')).toBe(17);
	});

	it('handles 29 February birthdays', () => {
		expect(ageOn('2004-02-29', '2022-02-28')).toBe(17);
		expect(ageOn('2004-02-29', '2022-03-01')).toBe(18);
	});

	it('returns null for invalid or future dates', () => {
		expect(ageOn('', '2026-10-01')).toBeNull();
		expect(ageOn('2001-02-30', '2026-10-01')).toBeNull();
		expect(ageOn('1990-1-1', '2026-10-01')).toBeNull();
		expect(ageOn('2027-01-01', '2026-10-01')).toBeNull();
	});
});
