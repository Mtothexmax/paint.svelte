// Layer: state (Svelte adapter). Line/curve-tool settings: brush (line)
// width, line style and arrow heads, plus a tiny action channel
// (finish/cancel) used by the options strip to drive the canvas line draft.
// The committed line is rasterised into the active layer (no live object).

import { writable, get } from 'svelte/store';
import { clamp } from '../core/geometry';
import type { ShapeLineStyle } from './shapes';

export type LineArrow = 'none' | 'start' | 'end' | 'both';

export const lineWidth = writable<number>(4); // line width in image px
export const lineStyle = writable<ShapeLineStyle>('solid');
/** Arrow heads per end (two independent toggles; combined to LineArrow). */
export const lineArrowStart = writable<boolean>(false);
export const lineArrowEnd = writable<boolean>(false);

/** Combines the two end toggles (used by the raster commit). */
export function combinedArrow(): LineArrow {
	const s = get(lineArrowStart);
	const e = get(lineArrowEnd);
	return s ? (e ? 'both' : 'start') : e ? 'end' : 'none';
}

export function setLineWidth(n: number): void {
	lineWidth.set(clamp(Math.round(n) || 1, 1, 50));
}

/** Options-strip → canvas request channel (mirrors state/polygon.ts). */
export const lineAction = writable<null | 'commit' | 'cancel'>(null);

export function requestLineCommit(): void {
	lineAction.set('commit');
}

export function requestLineCancel(): void {
	lineAction.set('cancel');
}

const LINES_KEY = 'paint.svelte.linesSettings.v1';

interface SavedLines {
	width: number;
	style: ShapeLineStyle;
	arrowStart: boolean;
	arrowEnd: boolean;
	/** Legacy single arrow value (migrated on load). */
	arrow?: LineArrow;
}

if (typeof window !== 'undefined') {
	try {
		const raw = localStorage.getItem(LINES_KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedLines>;
			if (typeof p.width === 'number' && Number.isFinite(p.width)) setLineWidth(p.width);
			if (p.style === 'solid' || p.style === 'dashed' || p.style === 'dotted') lineStyle.set(p.style);
			if (typeof p.arrowStart === 'boolean') lineArrowStart.set(p.arrowStart);
			if (typeof p.arrowEnd === 'boolean') lineArrowEnd.set(p.arrowEnd);
			if (typeof p.arrow === 'string') {
				lineArrowStart.set(p.arrow === 'start' || p.arrow === 'both');
				lineArrowEnd.set(p.arrow === 'end' || p.arrow === 'both');
			}
		}
	} catch {
		/* storage unavailable — ignore */
	}
	const write = () => {
		try {
			const saved: SavedLines = {
				width: get(lineWidth),
				style: get(lineStyle),
				arrowStart: get(lineArrowStart),
				arrowEnd: get(lineArrowEnd)
			};
			localStorage.setItem(LINES_KEY, JSON.stringify(saved));
		} catch {
			/* ignore */
		}
	};
	for (const store of [lineWidth, lineStyle, lineArrowStart, lineArrowEnd]) {
		store.subscribe(write);
	}
}
