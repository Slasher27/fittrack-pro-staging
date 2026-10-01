import { error } from '@sveltejs/kit';
import { showDevRoutes } from '$lib/dev';

export const load = () => {
	if (!showDevRoutes) error(404, 'Not found');
};
