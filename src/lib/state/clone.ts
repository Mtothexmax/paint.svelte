// Layer: state (Svelte adapter). Clone-stamp settings: brush size, opacity
// and hardness. The source anchor itself lives on the CloneEngine (set via
// Alt+click). Persisted in localStorage like the brush settings.

import { writable, get } from 'svelte/store';
import { clamp } from '../core/geometry';

export const cloneSize = writable(24);
export const cloneOpacity = writable(100); // percent 0..100
export const cloneHardness = writable(60); // percent 0..100

const CLONE_KEY = 'paint.svelte.cloneSettings.v1';

interface SavedClone {
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
		const raw = localStorage.getItem(CLONE_KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedClone>;
			if (typeof p.size === 'number') cloneSize.set(clampInt(p.size, 1, 400, get(cloneSize)));
			if (typeof p.opacity === 'number') cloneOpacity.set(clampInt(p.opacity, 0, 100, get(cloneOpacity)));
			if (typeof p.hardness === 'number') cloneHardness.set(clampInt(p.hardness, 0, 100, get(cloneHardness)));
		}
	} catch {
		/* storage unavailable — ignore */
	}
	const write = () => {
		try {
			localStorage.setItem(
				CLONE_KEY,
				JSON.stringify({ size: get(cloneSize), opacity: get(cloneOpacity), hardness: get(cloneHardness) })
			);
		} catch {
			/* ignore */
		}
	};
	for (const store of [cloneSize, cloneOpacity, cloneHardness]) {
		store.subscribe(write);
	}
}
