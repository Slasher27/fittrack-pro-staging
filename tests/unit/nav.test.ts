import { describe, expect, it } from 'vitest';
import { safeNext } from '$lib/nav';

describe('safeNext', () => {
	it('keeps same-origin paths', () => {
		expect(safeNext('/nutrition?day=2026-10-01')).toBe('/nutrition?day=2026-10-01');
	});

	it('falls back for missing, absolute or protocol-relative targets', () => {
		expect(safeNext(null)).toBe('/today');
		expect(safeNext('https://evil.example')).toBe('/today');
		expect(safeNext('//evil.example')).toBe('/today');
		expect(safeNext('/\\evil.example')).toBe('/today');
	});
});
