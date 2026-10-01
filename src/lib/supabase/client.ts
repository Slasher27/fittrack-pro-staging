import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';
import type { Database } from './types';

// Null when the build has no backend configured (Netlify previews before Phase 3, D-032).
// Screens that need the backend show their error state instead of crashing.
export const supabase: SupabaseClient<Database> | null =
	env.PUBLIC_SUPABASE_URL && env.PUBLIC_SUPABASE_ANON_KEY
		? createClient<Database>(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY)
		: null;

export const BACKEND_MISSING = 'This preview has no backend yet, so you can’t sign in here.';
