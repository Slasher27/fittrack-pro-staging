import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';

/** Dev-only routes (/dev/components): `pnpm dev`, or builds with PUBLIC_DEV_ROUTES=1 (e2e, previews). */
export const showDevRoutes = dev || env.PUBLIC_DEV_ROUTES === '1';
