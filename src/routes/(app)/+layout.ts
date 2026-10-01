import { requireSession } from '$lib/guard';

export const load = ({ url }) => requireSession(url);
