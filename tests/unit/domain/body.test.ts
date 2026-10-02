import { describe, expect, it } from 'vitest';
import {
	fitWithin,
	history,
	photosByDate,
	toMeasurement,
	validateMeasure,
	type MeasureForm
} from '$lib/domain/body';

const blank: MeasureForm = {
	date: '2026-10-01',
	weight_kg: '',
	waist_cm: '',
	chest_cm: '',
	arm_cm: '',
	thigh_cm: '',
	notes: ''
};

describe('validateMeasure', () => {
	it('accepts any subset of measurements', () => {
		expect(validateMeasure({ ...blank, waist_cm: '86,5' }, '2026-10-01')).toEqual({});
		expect(validateMeasure({ ...blank, notes: 'Fasted, morning' }, '2026-10-01')).toEqual({});
	});

	it('needs something, a past date and sane numbers', () => {
		expect(validateMeasure(blank, '2026-10-01')).toEqual({
			form: 'Enter at least one measurement.'
		});
		const e = validateMeasure(
			{ ...blank, date: '2026-10-02', weight_kg: '4', arm_cm: 'abc' },
			'2026-10-01'
		);
		expect(Object.keys(e).sort()).toEqual(['arm_cm', 'date', 'weight_kg']);
		expect(e.weight_kg).toBe('Enter a number from 20 to 400 kg.');
	});

	it('refuses moving an entry onto a date that already has one', () => {
		const f = { ...blank, date: '2026-09-30', weight_kg: '80' };
		expect(validateMeasure(f, '2026-10-01', ['2026-09-30']).date).toBe(
			'There’s already an entry for this date. Edit that one instead.'
		);
		expect(validateMeasure(f, '2026-10-01', ['2026-09-29'])).toEqual({});
	});
});

describe('toMeasurement', () => {
	it('parses commas, rounds and nulls empty fields', () => {
		expect(
			toMeasurement({ ...blank, weight_kg: '81,456', waist_cm: '86.04', notes: '  ' })
		).toEqual({
			weight_kg: 81.46,
			waist_cm: 86,
			chest_cm: null,
			arm_cm: null,
			thigh_cm: null,
			notes: null
		});
	});
});

describe('history', () => {
	it('keeps one entry per date (newest edit), newest date first, skipping deleted', () => {
		const rows = [
			{ id: 'a', date: '2026-09-30', up: 1 },
			{ id: 'b', date: '2026-10-01', up: 1 },
			{ id: 'c', date: '2026-10-01', up: 5 },
			{ id: 'd', date: '2026-09-29', up: 1, deleted: true }
		];
		expect(history(rows).map((r) => r.id)).toEqual(['c', 'a']);
	});
});

describe('photos', () => {
	it('groups by date, newest first', () => {
		const rows = [
			{ id: '1', taken_on: '2026-09-01' },
			{ id: '2', taken_on: '2026-10-01' },
			{ id: '3', taken_on: '2026-10-01' },
			{ id: '4', taken_on: '2026-08-01', deleted: true }
		];
		expect(photosByDate(rows).map(([d, ps]) => [d, ps.map((p) => p.id)])).toEqual([
			['2026-10-01', ['2', '3']],
			['2026-09-01', ['1']]
		]);
	});

	it('fits images inside 1280 px like v3', () => {
		expect(fitWithin(4032, 3024)).toEqual({ w: 1280, h: 960 });
		expect(fitWithin(3024, 4032)).toEqual({ w: 960, h: 1280 });
		expect(fitWithin(800, 600)).toEqual({ w: 800, h: 600 });
	});
});
