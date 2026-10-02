import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAPABILITIES } from '$lib/domain/capabilities';
import { CATALOG, CATEGORIES } from '$lib/domain/catalog';
import {
	addWeight,
	assumeFullFor,
	capabilities,
	DEFAULT_WEIGHTS,
	orderGyms,
	parseKg,
	validateCustom,
	validateGymName,
	validateWeights,
	weightsLabel
} from '$lib/domain/equipment';

describe('bundled catalogue (D-039)', () => {
	it('matches the migration row for row', () => {
		const sql = readFileSync('supabase/migrations/0005_equipment_catalog_data.sql', 'utf8');
		const rows = [
			...sql.matchAll(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'\{([^}]*)\}',\s*'([^']+)'\)/g)
		].map(([, id, name, category, caps, weight_kind]) => ({
			id,
			name,
			category,
			capabilities: caps.split(','),
			weight_kind
		}));
		expect(rows.length).toBe(34);
		expect(CATALOG).toEqual(rows);
	});

	it('uses known categories and every capability is provided', () => {
		const cats: string[] = CATEGORIES.map((c) => c.id);
		expect(CATALOG.every((c) => cats.includes(c.category))).toBe(true);
		expect(new Set(CATALOG.flatMap((c) => c.capabilities))).toEqual(new Set(CAPABILITIES));
	});

	it('default weights fit their items', () => {
		for (const [id, w] of Object.entries(DEFAULT_WEIGHTS)) {
			const item = CATALOG.find((c) => c.id === id);
			expect(item, id).toBeDefined();
			expect(validateWeights(item!.weight_kind, w), id).toBeNull();
		}
	});
});

describe('capabilities', () => {
	it('is the union of live items', () => {
		const caps = capabilities({ assume_full: false }, [
			{ capabilities: ['dumbbell'] },
			{ capabilities: ['rack', 'pull-up-bar'] },
			{ capabilities: ['barbell'], deleted: true }
		]);
		expect([...caps].sort()).toEqual(['dumbbell', 'pull-up-bar', 'rack']);
	});

	it('full equipment means everything, whatever is listed', () => {
		expect(capabilities({ assume_full: true }, []).size).toBe(CAPABILITIES.length);
	});

	it('ignores unknown tokens', () => {
		expect(capabilities({ assume_full: false }, [{ capabilities: ['jetpack'] }]).size).toBe(0);
	});

	it('a commercial gym starts as full equipment', () => {
		expect(assumeFullFor('commercial')).toBe(true);
		expect(assumeFullFor('home')).toBe(false);
	});
});

describe('weights', () => {
	it('accepts the server shapes', () => {
		expect(validateWeights('range', { min: 2, max: 32, step: 2 })).toBeNull();
		expect(validateWeights('list', [12, 16, 24])).toBeNull();
		expect(validateWeights('none', null)).toBeNull();
		expect(validateWeights('list', null)).toBeNull();
	});

	it('refuses what the server refuses', () => {
		expect(validateWeights('range', { min: 32, max: 2, step: 2 })).toMatch(/lightest/);
		expect(validateWeights('range', { min: 2, max: 32, step: 0 })).toMatch(/step/);
		expect(validateWeights('range', [2, 4])).not.toBeNull();
		expect(validateWeights('list', [])).toMatch(/at least one/);
		expect(validateWeights('list', [12, -1])).not.toBeNull();
		expect(validateWeights('list', [600])).not.toBeNull();
		expect(validateWeights('none', [10])).toMatch(/no weights/);
		expect(validateWeights(null, [10])).toMatch(/no weights/); // custom kit
	});

	it('parses kg with a comma or a point', () => {
		expect(parseKg('12,5')).toBe(12.5);
		expect(parseKg(' 1.25 ')).toBe(1.25);
		expect(parseKg('0')).toBeNull();
		expect(parseKg('12kg')).toBeNull();
		expect(parseKg('')).toBeNull();
	});

	it('keeps lists sorted without duplicates', () => {
		expect(addWeight([16, 24], 12)).toEqual([12, 16, 24]);
		expect(addWeight([12, 16], 16)).toEqual([12, 16]);
	});

	it('labels ranges and lists', () => {
		expect(weightsLabel({ min: 2, max: 32, step: 2 })).toBe('2 – 32 kg · 2 kg steps');
		expect(weightsLabel([12, 16, 24])).toBe('12, 16, 24 kg');
		expect(weightsLabel([1.25, 2.5])).toBe('1.25, 2.5 kg');
		expect(weightsLabel(null)).toBe('');
	});
});

describe('gyms', () => {
	it('names are 1 to 60 characters', () => {
		expect(validateGymName('  ')).not.toBeNull();
		expect(validateGymName('x'.repeat(61))).not.toBeNull();
		expect(validateGymName(' Home ')).toBeNull();
	});

	it('custom kit needs a name and at least one capability', () => {
		expect(validateCustom('', [])).toEqual({
			name: 'Name this equipment.',
			caps: 'Choose at least one thing it counts as, so workouts can use it.'
		});
		expect(validateCustom('Sandbag', ['kettlebell'])).toEqual({});
	});

	it('orders the default first, then by name; the newest default wins', () => {
		const g = (name: string, is_default: boolean, up: number, deleted = false) => ({
			name,
			is_default,
			up,
			deleted
		});
		const order = orderGyms([
			g('Park', false, 1),
			g('Home', true, 5),
			g('Office', true, 9),
			g('Attic', false, 1, true)
		]).map((x) => x.name);
		expect(order).toEqual(['Office', 'Home', 'Park']);
	});
});
