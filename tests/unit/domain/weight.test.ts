import { describe, expect, it } from 'vitest';
import { changeLabel, weightTrend } from '$lib/domain/weight';

const m = (date: string, kg: number | null, deleted = false) => ({ date, weight_kg: kg, deleted });

describe('weightTrend', () => {
	it('averages the last 7 days and compares with the 7 before', () => {
		const t = weightTrend(
			[
				m('2026-09-17', 83), // outside both windows (previous week is 18–24 Sep)
				m('2026-09-21', 82.4), // previous week
				m('2026-09-24', 82.0),
				m('2026-09-25', 81.8), // this week (25 Sep – 1 Oct)
				m('2026-09-28', 81.6),
				m('2026-10-01', 81.5)
			],
			'2026-10-01'
		);
		expect(t).toEqual({ average: 81.6, change: -0.6, latest: { date: '2026-10-01', kg: 81.5 } });
	});

	it('has no change without a previous week, and nothing without recent entries', () => {
		expect(weightTrend([m('2026-10-01', 80)], '2026-10-01')?.change).toBeNull();
		expect(weightTrend([m('2026-09-01', 80)], '2026-10-01')).toBeNull();
		expect(
			weightTrend([m('2026-10-01', null), m('2026-09-30', 79, true)], '2026-10-01')
		).toBeNull();
	});

	it('ignores future-dated entries', () => {
		expect(weightTrend([m('2026-10-01', 80), m('2026-10-02', 90)], '2026-10-01')?.average).toBe(80);
	});
});

describe('changeLabel', () => {
	it('always says the direction in words or signs, not colour', () => {
		expect(changeLabel(-0.3)).toBe('−0.3 kg this week');
		expect(changeLabel(0.5)).toBe('+0.5 kg this week');
		expect(changeLabel(0)).toBe('No change this week');
	});
});
