// Toasts: a tiny shared queue rendered by <Toaster/> in the root layout.
export type ToastItem = { id: number; message: string; tone: 'neutral' | 'ok' | 'warn' };

export const toasts = $state<ToastItem[]>([]);
let next = 1;

export function toast(message: string, tone: ToastItem['tone'] = 'neutral', ms = 4000) {
	const id = next++;
	toasts.push({ id, message, tone });
	setTimeout(() => dismiss(id), ms);
}

export function dismiss(id: number) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}
