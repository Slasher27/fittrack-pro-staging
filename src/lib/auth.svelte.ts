import type { Session } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase/client';

// Shared auth state. `authReady` resolves once the stored session (or a link in the URL) is read.
export const auth = $state<{ session: Session | null; recovering: boolean }>({
	session: null,
	recovering: false
});

// Subscribe before initialisation finishes so PASSWORD_RECOVERY from a reset link isn't missed.
supabase?.auth.onAuthStateChange((event, session) => {
	auth.session = session;
	if (event === 'PASSWORD_RECOVERY') auth.recovering = true;
});

export const authReady: Promise<void> = supabase
	? supabase.auth.getSession().then(({ data }) => {
			auth.session = data.session;
		})
	: Promise.resolve();
