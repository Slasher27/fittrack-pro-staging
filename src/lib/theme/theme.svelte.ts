// Theme preference: Auto / Light / Dark (DESIGN-SYSTEM §5). A device setting, kept in localStorage.
// app.html applies it before first paint; this keeps it in sync afterwards.
export type ThemePref = 'auto' | 'light' | 'dark';
const KEY = 'theme';

function read(): ThemePref {
	try {
		const v = localStorage.getItem(KEY);
		return v === 'light' || v === 'dark' ? v : 'auto';
	} catch {
		return 'auto';
	}
}

export const theme = $state<{ pref: ThemePref }>({ pref: read() });

export function setTheme(pref: ThemePref) {
	theme.pref = pref;
	try {
		if (pref === 'auto') localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, pref);
	} catch {
		// Storage blocked: the choice lasts for this session only.
	}
	if (pref === 'auto') delete document.documentElement.dataset.theme;
	else document.documentElement.dataset.theme = pref;
}
