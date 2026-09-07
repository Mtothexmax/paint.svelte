// Layer: state (Svelte adapter). Gradient-fill settings: gradient mode
// (linear, radial, diamond, conical — foreground to background) and repeat
// mode (none, wrapped, mirrored), plus a tiny action channel (finish/cancel)
// used by the options strip to drive the canvas gradient draft. The draft
// itself lives in EditorCanvas; commit rasterises into the active layer.

import { writable, get } from 'svelte/store';

export type GradientMode = 'linear' | 'radial' | 'diamond' | 'conical';
export type GradientRepeat = 'none' | 'wrapped' | 'mirrored';

export const gradientMode = writable<GradientMode>('linear');
export const gradientRepeat = writable<GradientRepeat>('none');

/** Options-strip → canvas request channel (mirrors state/polygon.ts). */
export const gradientAction = writable<null | 'commit' | 'cancel'>(null);

export function requestGradientCommit(): void {
	gradientAction.set('commit');
}

export function requestGradientCancel(): void {
	gradientAction.set('cancel');
}

const GRADIENT_KEY = 'paint.svelte.gradientSettings.v1';

interface SavedGradient {
	mode: GradientMode;
	repeat: GradientRepeat;
}

if (typeof window !== 'undefined') {
	try {
		const raw = localStorage.getItem(GRADIENT_KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedGradient>;
			if (p.mode === 'linear' || p.mode === 'radial' || p.mode === 'diamond' || p.mode === 'conical') {
				gradientMode.set(p.mode);
			}
			if (p.repeat === 'none' || p.repeat === 'wrapped' || p.repeat === 'mirrored') {
				gradientRepeat.set(p.repeat);
			}
		}
	} catch {
		/* storage unavailable — ignore */
	}
	const write = () => {
		try {
			const saved: SavedGradient = { mode: get(gradientMode), repeat: get(gradientRepeat) };
			localStorage.setItem(GRADIENT_KEY, JSON.stringify(saved));
		} catch {
			/* ignore */
		}
	};
	for (const store of [gradientMode, gradientRepeat]) {
		store.subscribe(write);
	}
}
