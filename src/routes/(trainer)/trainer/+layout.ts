import { requireSession } from '$lib/guard';

// Phase 4 adds the trainer check (trainers row) on top of the session.
export const load = ({ url }) => requireSession(url);
