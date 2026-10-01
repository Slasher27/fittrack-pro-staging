// Online status for offline states (CLAUDE.md: every screen has one).
export const net = $state({ online: typeof navigator === 'undefined' ? true : navigator.onLine });

if (typeof window !== 'undefined') {
	window.addEventListener('online', () => (net.online = true));
	window.addEventListener('offline', () => (net.online = false));
}
