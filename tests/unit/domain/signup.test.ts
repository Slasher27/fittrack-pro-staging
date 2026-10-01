import { describe, expect, it } from 'vitest';
import {
	CONSENT_VERSION,
	signUpMetadata,
	validateSignUp,
	type SignUpInput
} from '$lib/domain/signup';

const valid: SignUpInput = {
	displayName: ' Lisa ',
	email: 'lisa@example.com',
	password: 'correct horse',
	birthDate: '1994-05-12',
	consent: true
};
const today = '2026-10-01';

describe('validateSignUp', () => {
	it('accepts a valid adult with consent', () => {
		expect(validateSignUp(valid, today)).toEqual({});
	});

	it('accepts someone turning 18 today and rejects someone turning 18 tomorrow', () => {
		expect(validateSignUp({ ...valid, birthDate: '2008-10-01' }, today)).toEqual({});
		expect(validateSignUp({ ...valid, birthDate: '2008-10-02' }, today).birthDate).toMatch(/18/);
	});

	it('requires consent, a name, an email, an 8-character password and a birth date', () => {
		const errors = validateSignUp(
			{ displayName: ' ', email: 'nope', password: 'short', birthDate: '', consent: false },
			today
		);
		expect(Object.keys(errors).sort()).toEqual(
			['birthDate', 'consent', 'displayName', 'email', 'password'].sort()
		);
	});
});

describe('signUpMetadata', () => {
	it('keeps only the birth year and records the consent version', () => {
		expect(signUpMetadata(valid)).toEqual({
			display_name: 'Lisa',
			birth_year: 1994,
			adult: true,
			consent_version: CONSENT_VERSION
		});
	});
});
