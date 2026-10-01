// Capability tokens: what a piece of kit lets you do. Exercises require tokens (Phase 2);
// gym equipment provides them. Ported from v3's equipment vocabulary unchanged (D-035);
// v3's 'none' means "no kit", which is simply an empty `requires`.
// Keep in sync with private.valid_capabilities() in supabase/migrations/0004_equipment.sql (tested).
export const CAPABILITIES = [
	'barbell',
	'rack',
	'bench',
	'dumbbell',
	'kettlebell',
	'pull-up-bar',
	'dip-station',
	'pulley',
	'band',
	'machine',
	'box',
	'rope',
	'rower',
	'bike',
	'ab-wheel',
	'ez-bar',
	'trap-bar',
	'landmine',
	'smith',
	'sled',
	'plate',
	'med-ball',
	'rings',
	'trx',
	'treadmill',
	'foam-roller',
	'stairs'
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export function isCapability(s: string): s is Capability {
	return (CAPABILITIES as readonly string[]).includes(s);
}
