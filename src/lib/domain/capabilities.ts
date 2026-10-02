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

/** What each capability is called on screen, e.g. "counts as: Barbell, Landmine" for custom kit. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
	barbell: 'Barbell',
	rack: 'Squat rack',
	bench: 'Bench',
	dumbbell: 'Dumbbells',
	kettlebell: 'Kettlebell',
	'pull-up-bar': 'Pull-up bar',
	'dip-station': 'Dip station',
	pulley: 'Cable or pulley',
	band: 'Resistance band',
	machine: 'Weight machine',
	box: 'Box or step',
	rope: 'Rope',
	rower: 'Rower',
	bike: 'Bike',
	'ab-wheel': 'Ab wheel',
	'ez-bar': 'EZ bar',
	'trap-bar': 'Trap bar',
	landmine: 'Landmine',
	smith: 'Smith machine',
	sled: 'Sled',
	plate: 'Weight plates',
	'med-ball': 'Medicine ball',
	rings: 'Rings',
	trx: 'Suspension trainer',
	treadmill: 'Treadmill',
	'foam-roller': 'Foam roller',
	stairs: 'Stairs'
};
