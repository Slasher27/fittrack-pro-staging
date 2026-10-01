import { describe, expect, it } from 'vitest';
import { formatInt } from '$lib/format';

describe('formatInt', () => {
	it('groups thousands with commas and rounds', () => {
		expect(formatInt(2235)).toBe('2,235');
		expect(formatInt(950)).toBe('950');
		expect(formatInt(1239.6)).toBe('1,240');
	});
});
