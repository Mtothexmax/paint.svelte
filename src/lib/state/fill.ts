// Layer: state (Svelte adapter). Paint-bucket settings: tolerance ("how
// different a pixel may be and still be filled", 0..100%) and flood mode
// (contiguous region vs. every matching pixel on the layer — Paint.NET
// behaviour). The draft-free tool commits immediately on click.

import { writable, get } from 'svelte/store';
import { clamp } from '../core/geometry';

/** Paint.NET-style flood scope: connected region vs. whole layer. */
export type FloodMode = 'contiguous' | 'global';

export const fillTolerance = writable<number>(50); // percent 0..100
export const fillFloodMode = writable<FloodMode>('contiguous');

export function setFillTolerance(n: number): void {
	fillTolerance.set(clamp(Math.round(n) || 0, 0, 100));
}

// --- persistence (localStorage, same pattern as text settings) --------------

const FILL_KEY = 'paint.svelte.fillSettings.v1';

interface SavedFill {
	tolerance: number;
	mode: FloodMode;
}

if (typeof window !== 'undefined') {
	try {
		const raw = localStorage.getItem(FILL_KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedFill>;
			if (typeof p.tolerance === 'number' && Number.isFinite(p.tolerance)) {
				setFillTolerance(p.tolerance);
			}
			if (p.mode === 'contiguous' || p.mode === 'global') fillFloodMode.set(p.mode);
		}
	} catch {
		/* storage unavailable — ignore */
	}
	const write = () => {
		try {
			const saved: SavedFill = { tolerance: get(fillTolerance), mode: get(fillFloodMode) };
			localStorage.setItem(FILL_KEY, JSON.stringify(saved));
		} catch {
			/* ignore */
		}
	};
	fillTolerance.subscribe(write);
	fillFloodMode.subscribe(write);
}
