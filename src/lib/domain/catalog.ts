// The equipment catalogue, bundled so gym profiles work offline from the first launch (D-039).
// Source of truth: supabase/migrations/0005_equipment_catalog_data.sql; a unit test keeps them equal.
import type { Capability } from './capabilities';

export type WeightKind = 'range' | 'list' | 'none';
export type CatalogItem = {
	id: string;
	name: string;
	category: Category;
	capabilities: Capability[];
	weight_kind: WeightKind;
};

export const CATEGORIES = [
	{ id: 'free-weights', label: 'Free weights' },
	{ id: 'racks-benches', label: 'Racks, benches & bars' },
	{ id: 'machines-cables', label: 'Machines & cables' },
	{ id: 'cardio', label: 'Cardio' },
	{ id: 'bodyweight', label: 'Bodyweight' },
	{ id: 'accessories', label: 'Accessories' }
] as const;
export type Category = (typeof CATEGORIES)[number]['id'];

export const CATALOG: CatalogItem[] = [
	{
		id: 'dumbbells-adjustable',
		name: 'Adjustable dumbbells',
		category: 'free-weights',
		capabilities: ['dumbbell'],
		weight_kind: 'range'
	},
	{
		id: 'dumbbells-fixed',
		name: 'Dumbbells (fixed pairs)',
		category: 'free-weights',
		capabilities: ['dumbbell'],
		weight_kind: 'list'
	},
	{
		id: 'kettlebells',
		name: 'Kettlebells',
		category: 'free-weights',
		capabilities: ['kettlebell'],
		weight_kind: 'list'
	},
	{
		id: 'barbell-olympic',
		name: 'Olympic barbell',
		category: 'free-weights',
		capabilities: ['barbell'],
		weight_kind: 'list'
	},
	{
		id: 'barbell-standard',
		name: 'Standard barbell',
		category: 'free-weights',
		capabilities: ['barbell'],
		weight_kind: 'list'
	},
	{
		id: 'ez-bar',
		name: 'EZ curl bar',
		category: 'free-weights',
		capabilities: ['ez-bar'],
		weight_kind: 'list'
	},
	{
		id: 'trap-bar',
		name: 'Trap / hex bar',
		category: 'free-weights',
		capabilities: ['trap-bar'],
		weight_kind: 'list'
	},
	{
		id: 'plates',
		name: 'Weight plates',
		category: 'free-weights',
		capabilities: ['plate'],
		weight_kind: 'list'
	},
	{
		id: 'med-ball',
		name: 'Medicine ball',
		category: 'free-weights',
		capabilities: ['med-ball'],
		weight_kind: 'list'
	},
	{
		id: 'squat-rack',
		name: 'Squat rack with safeties',
		category: 'racks-benches',
		capabilities: ['rack'],
		weight_kind: 'none'
	},
	{
		id: 'power-rack',
		name: 'Power rack with pull-up bar',
		category: 'racks-benches',
		capabilities: ['rack', 'pull-up-bar'],
		weight_kind: 'none'
	},
	{
		id: 'bench-adjustable',
		name: 'Adjustable bench',
		category: 'racks-benches',
		capabilities: ['bench'],
		weight_kind: 'none'
	},
	{
		id: 'bench-flat',
		name: 'Flat bench',
		category: 'racks-benches',
		capabilities: ['bench'],
		weight_kind: 'none'
	},
	{
		id: 'pull-up-bar',
		name: 'Pull-up bar',
		category: 'racks-benches',
		capabilities: ['pull-up-bar'],
		weight_kind: 'none'
	},
	{
		id: 'dip-station',
		name: 'Dip station',
		category: 'racks-benches',
		capabilities: ['dip-station'],
		weight_kind: 'none'
	},
	{
		id: 'landmine',
		name: 'Landmine attachment',
		category: 'racks-benches',
		capabilities: ['landmine'],
		weight_kind: 'none'
	},
	{
		id: 'plyo-box',
		name: 'Plyo box or step',
		category: 'racks-benches',
		capabilities: ['box'],
		weight_kind: 'none'
	},
	{
		id: 'cable-machine',
		name: 'Cable machine',
		category: 'machines-cables',
		capabilities: ['pulley'],
		weight_kind: 'none'
	},
	{
		id: 'functional-trainer',
		name: 'Functional trainer',
		category: 'machines-cables',
		capabilities: ['pulley'],
		weight_kind: 'none'
	},
	{
		id: 'smith-machine',
		name: 'Smith machine',
		category: 'machines-cables',
		capabilities: ['smith'],
		weight_kind: 'none'
	},
	{
		id: 'leg-press',
		name: 'Leg press',
		category: 'machines-cables',
		capabilities: ['machine'],
		weight_kind: 'none'
	},
	{
		id: 'weight-machines',
		name: 'Weight machines (pin-loaded)',
		category: 'machines-cables',
		capabilities: ['machine'],
		weight_kind: 'none'
	},
	{
		id: 'sled',
		name: 'Sled',
		category: 'machines-cables',
		capabilities: ['sled'],
		weight_kind: 'none'
	},
	{
		id: 'rower',
		name: 'Rowing machine',
		category: 'cardio',
		capabilities: ['rower'],
		weight_kind: 'none'
	},
	{
		id: 'bike',
		name: 'Exercise or air bike',
		category: 'cardio',
		capabilities: ['bike'],
		weight_kind: 'none'
	},
	{
		id: 'treadmill',
		name: 'Treadmill',
		category: 'cardio',
		capabilities: ['treadmill'],
		weight_kind: 'none'
	},
	{
		id: 'skipping-rope',
		name: 'Skipping rope',
		category: 'cardio',
		capabilities: ['rope'],
		weight_kind: 'none'
	},
	{
		id: 'battle-ropes',
		name: 'Battle ropes',
		category: 'cardio',
		capabilities: ['rope'],
		weight_kind: 'none'
	},
	{
		id: 'stairs',
		name: 'Stairs',
		category: 'cardio',
		capabilities: ['stairs'],
		weight_kind: 'none'
	},
	{
		id: 'rings',
		name: 'Gymnastic rings',
		category: 'bodyweight',
		capabilities: ['rings'],
		weight_kind: 'none'
	},
	{
		id: 'suspension-trainer',
		name: 'Suspension trainer (TRX)',
		category: 'bodyweight',
		capabilities: ['trx'],
		weight_kind: 'none'
	},
	{
		id: 'ab-wheel',
		name: 'Ab wheel',
		category: 'bodyweight',
		capabilities: ['ab-wheel'],
		weight_kind: 'none'
	},
	{
		id: 'resistance-bands',
		name: 'Resistance bands',
		category: 'accessories',
		capabilities: ['band'],
		weight_kind: 'none'
	},
	{
		id: 'foam-roller',
		name: 'Foam roller',
		category: 'accessories',
		capabilities: ['foam-roller'],
		weight_kind: 'none'
	}
];

export const catalogItem = (id: string) => CATALOG.find((c) => c.id === id);
