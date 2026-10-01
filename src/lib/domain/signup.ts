// Sign-up rules: 18+ age gate (D-012) and POPIA processing consent (BUSINESS-RULES §6, D-033).
// The server trigger re-checks the same metadata (supabase/migrations/0001_profiles.sql).
import { ageOn } from './dates';

/** Bump when the consent text changes; stored with each sign-up as evidence. */
export const CONSENT_VERSION = '2026-10-01';
export const MIN_AGE = 18;
export const MIN_PASSWORD_LENGTH = 8;

export type SignUpInput = {
	displayName: string;
	email: string;
	password: string;
	birthDate: string; // ISO date from <input type="date">
	consent: boolean;
};

export type SignUpErrors = Partial<Record<keyof SignUpInput, string>>;

export type SignUpMetadata = {
	display_name: string;
	birth_year: number;
	adult: true;
	consent_version: string;
};

export function validateSignUp(input: SignUpInput, today: string): SignUpErrors {
	const errors: SignUpErrors = {};
	if (!input.displayName.trim()) errors.displayName = 'Enter your name.';
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))
		errors.email = 'Enter an email address like name@example.com.';
	if (input.password.length < MIN_PASSWORD_LENGTH)
		errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
	const age = ageOn(input.birthDate, today);
	if (age === null) errors.birthDate = 'Enter your date of birth.';
	else if (age < MIN_AGE) errors.birthDate = `FitTrack Pro is for adults (${MIN_AGE} or older).`;
	if (!input.consent) errors.consent = 'You need to agree to this to use FitTrack Pro.';
	return errors;
}

/** Metadata sent with auth sign-up. Only the birth year is kept, not the full date. */
export function signUpMetadata(input: SignUpInput): SignUpMetadata {
	return {
		display_name: input.displayName.trim(),
		birth_year: Number(input.birthDate.slice(0, 4)),
		adult: true,
		consent_version: CONSENT_VERSION
	};
}
