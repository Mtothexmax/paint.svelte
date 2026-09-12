// Layer: state (Svelte adapter). View settings: the transparency
// checkerboard theme (bright = white/light-gray, dark = gray/black).
// Persisted in localStorage; applied to the renderer by the view commands.

import { writable } from 'svelte/store';

export type CheckerTheme = 'bright' | 'dark';

export const checkerTheme = writable<CheckerTheme>('dark');

export function setCheckerTheme(theme: CheckerTheme): void {
	checkerTheme.set(theme);
}

// v2: v1 payloads may hold a stale 'bright' from when bright was the code
// default. The default is dark, so v1 records are ignored on purpose —
// anyone who explicitly prefers bright re-toggles once (menu: View) and it
// persists under v2 from then on.
const VIEW_KEY = 'paint.svelte.viewSettings.v2';

interface SavedView {
	checker: CheckerTheme;
}

if (typeof window !== 'undefined') {
	try {
		const raw = localStorage.getItem(VIEW_KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedView>;
			if (p.checker === 'bright' || p.checker === 'dark') checkerTheme.set(p.checker);
		}
	} catch {
		/* storage unavailable — ignore */
	}
	checkerTheme.subscribe((theme) => {
		try {
			const saved: SavedView = { checker: theme };
			localStorage.setItem(VIEW_KEY, JSON.stringify(saved));
		} catch {
			/* ignore */
		}
	});
}
