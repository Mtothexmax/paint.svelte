// Layer: state (Svelte adapter). Recolor-brush settings: brush size, opacity
// and hardness. The brush paints the foreground colour while preserving the
// destination alpha. Persisted in localStorage like the brush settings.

import { writable, get } from 'svelte/store';
import { clamp } from '../core/geometry';

export const recolorSize = writable(24);
export const recolorOpacity = writable(100); // percent 0..100
export const recolorHardness = writable(60); // percent 0..100

const RECOLOR_KEY = 'paint.svelte.recolorSettings.v1';

interface SavedRecolor {
	size: number;
	opacity: number;
	hardness: number;
}

function clampInt(value: unknown, lo: number, hi: number, fallback: number): number {
	const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
	return clamp(n, lo, hi);
}

if (typeof window !== 'undefined') {
	try {
		const raw = localStorage.getItem(RECOLOR_KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedRecolor>;
			if (typeof p.size === 'number') recolorSize.set(clampInt(p.size, 1, 400, get(recolorSize)));
			if (typeof p.opacity === 'number') recolorOpacity.set(clampInt(p.opacity, 0, 100, get(recolorOpacity)));
			if (typeof p.hardness === 'number') recolorHardness.set(clampInt(p.hardness, 0, 100, get(recolorHardness)));
		}
	} catch {
		/* storage unavailable — ignore */
	}
	const write = () => {
		try {
			localStorage.setItem(
				RECOLOR_KEY,
				JSON.stringify({ size: get(recolorSize), opacity: get(recolorOpacity), hardness: get(recolorHardness) })
			);
		} catch {
			/* ignore */
		}
	};
	for (const store of [recolorSize, recolorOpacity, recolorHardness]) {
		store.subscribe(write);
	}
}
