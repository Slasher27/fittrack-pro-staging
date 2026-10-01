// Where to go after signing in: only same-origin paths, never an open redirect.
export function safeNext(next: string | null, fallback = '/today'): string {
	return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
		? next
		: fallback;
}
