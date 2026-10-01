// Weight trend: 7-day average and its change from the 7 days before (PRD §4.1 Progress, Today).

type Metric = { date: string; weight_kg: number | null; deleted?: boolean };

const shift = (date: string, days: number) => {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

function average(metrics: Metric[], from: string, to: string): number | null {
	const w = metrics
		.filter((m) => !m.deleted && m.weight_kg != null && m.date >= from && m.date <= to)
		.map((m) => Number(m.weight_kg));
	return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
}

export type WeightTrend = {
	average: number;
	change: number | null;
	latest: { date: string; kg: number };
};

/** Average of the 7 days ending `today`, the change versus the 7 days before, and the latest entry. */
export function weightTrend(metrics: Metric[], today: string): WeightTrend | null {
	const avg = average(metrics, shift(today, -6), today);
	if (avg === null) return null;
	const prev = average(metrics, shift(today, -13), shift(today, -7));
	const latest = metrics
		.filter((m) => !m.deleted && m.weight_kg != null && m.date <= today)
		.sort((a, b) => b.date.localeCompare(a.date))[0];
	return {
		average: Math.round(avg * 10) / 10,
		change: prev === null ? null : Math.round((avg - prev) * 10) / 10,
		latest: { date: latest.date, kg: Number(latest.weight_kg) }
	};
}

/** "−0.3 kg this week", "+0.5 kg this week", "No change this week". */
export function changeLabel(change: number): string {
	if (change === 0) return 'No change this week';
	return `${change < 0 ? '−' : '+'}${Math.abs(change).toFixed(1)} kg this week`;
}
