// Layer: state (Svelte adapter). Shapes-tool settings: shape kind
// (rectangle default), brush (line) width, line style and draw style:
// outline only, filled only, or filled with outline (Paint.NET behaviour:
// outline = foreground, fill = background).

import { writable, get } from 'svelte/store';
import { clamp } from '../core/geometry';

export type ShapeKind =
	| 'rectangle'
	| 'rounded-rect'
	| 'ellipse'
	| 'triangle'
	| 'diamond'
	| 'pentagon'
	| 'hexagon'
	| 'star';

export const SHAPE_KINDS: Array<{ id: ShapeKind; label: string }> = [
	{ id: 'rectangle', label: 'Rectangle' },
	{ id: 'rounded-rect', label: 'Rounded Rectangle' },
	{ id: 'ellipse', label: 'Ellipse' },
	{ id: 'triangle', label: 'Triangle' },
	{ id: 'diamond', label: 'Diamond' },
	{ id: 'pentagon', label: 'Pentagon' },
	{ id: 'hexagon', label: 'Hexagon' },
	{ id: 'star', label: 'Star' }
];

export type ShapeLineStyle = 'solid' | 'dashed' | 'dotted';

/** 1 = outline, 2 = filled, 3 = filled with outline. */
export type ShapeDrawStyle = 'outline' | 'fill' | 'fill-outline';

export const shapeKind = writable<ShapeKind>('rectangle');
export const shapeWidth = writable<number>(4); // line width in image px
export const shapeLineStyle = writable<ShapeLineStyle>('solid');
export const shapeDrawStyle = writable<ShapeDrawStyle>('outline');

export function setShapeWidth(n: number): void {
	shapeWidth.set(clamp(Math.round(n) || 1, 1, 50));
}

const SHAPES_KEY = 'paint.svelte.shapesSettings.v1';

interface SavedShapes {
	kind: ShapeKind;
	width: number;
	line: ShapeLineStyle;
	draw: ShapeDrawStyle;
}

if (typeof window !== 'undefined') {
	try {
		const raw = localStorage.getItem(SHAPES_KEY);
		if (raw) {
			const p = JSON.parse(raw) as Partial<SavedShapes>;
			if (typeof p.kind === 'string' && SHAPE_KINDS.some((k) => k.id === p.kind)) {
				shapeKind.set(p.kind as ShapeKind);
			}
			if (typeof p.width === 'number' && Number.isFinite(p.width)) setShapeWidth(p.width);
			if (p.line === 'solid' || p.line === 'dashed' || p.line === 'dotted') shapeLineStyle.set(p.line);
			if (p.draw === 'outline' || p.draw === 'fill' || p.draw === 'fill-outline') shapeDrawStyle.set(p.draw);
		}
	} catch {
		/* storage unavailable — ignore */
	}
	const write = () => {
		try {
			const saved: SavedShapes = {
				kind: get(shapeKind),
				width: get(shapeWidth),
				line: get(shapeLineStyle),
				draw: get(shapeDrawStyle)
			};
			localStorage.setItem(SHAPES_KEY, JSON.stringify(saved));
		} catch {
			/* ignore */
		}
	};
	for (const store of [shapeKind, shapeWidth, shapeLineStyle, shapeDrawStyle]) {
		store.subscribe(write);
	}
}
