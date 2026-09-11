// Layer: core (framework-free). Pure geometry helpers and types.

export interface Point {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function clamp(value: number, min: number, max: number): number {
	return value < min ? min : value > max ? max : value;
}

export function clampInt(value: number, min: number, max: number): number {
	return Math.round(clamp(value, min, max));
}

/** true when the point is inside the rect (inclusive of edges). */
export function pointInRect(px: number, py: number, rect: Rect): boolean {
	return px >= rect.x && px < rect.x + rect.width && py >= rect.y && py < rect.y + rect.height;
}

/** true when the point is inside the polygon (ray-casting, boundary not inclusive). */
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const a = polygon[i];
		const b = polygon[j];
		if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
	}
	return inside;
}

/** Axis-aligned rect spanning two opposite corners (works in any drag direction). */
export function rectFromCorners(a: Point, b: Point): Rect {
	return {
		x: Math.min(a.x, b.x),
		y: Math.min(a.y, b.y),
		width: Math.abs(b.x - a.x),
		height: Math.abs(b.y - a.y)
	};
}

export function rectsEqual(a: Rect, b: Rect): boolean {
	return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function makeRect(x: number, y: number, width: number, height: number): Rect {
	return { x, y, width, height };
}

/** The eight scale-handle positions of a selection frame: the four corners
 * plus the four edge midpoints. For an axis-aligned rect these are exactly
 * the classic bounds handles; for rotated/composite outlines they sit on the
 * visible shape instead of a detached bounding box. Image space, y-down. */
export interface FramePoints {
	nw: Point;
	n: Point;
	ne: Point;
	e: Point;
	se: Point;
	s: Point;
	sw: Point;
	w: Point;
}

/** Fits a FramePoints to outline loops: corners are the diagonal extremes
 * (vertices of the loops), edges the midpoints of the extreme quad — always
 * on (or, for concave loops, near) the visible shape. Deterministic: the
 * first point attaining each extreme wins. Null when there is no usable
 * point. Image space, y-down (nw = min(x+y), ne = max(x−y), …). */
export function framePointsFromLoops(loops: Point[][]): FramePoints | null {
	let nw: Point | null = null;
	let ne: Point | null = null;
	let se: Point | null = null;
	let sw: Point | null = null;
	let n: Point | null = null;
	let s: Point | null = null;
	let w: Point | null = null;
	let e: Point | null = null;
	for (const loop of loops) {
		for (const p of loop) {
			if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
			if (!n || p.y < n.y) n = p;
			if (!s || p.y > s.y) s = p;
			if (!w || p.x < w.x) w = p;
			if (!e || p.x > e.x) e = p;
			if (!nw || p.x + p.y < nw.x + nw.y) nw = p;
			if (!ne || p.x - p.y > ne.x - ne.y) ne = p;
			if (!se || p.x + p.y > se.x + se.y) se = p;
			if (!sw || p.y - p.x > sw.y - sw.x) sw = p;
		}
	}
	if (!nw || !ne || !se || !sw || !n || !s || !w || !e) return null;
	const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
	return { nw, n: mid(nw, ne), ne, e: mid(ne, se), se, s: mid(se, sw), sw, w: mid(sw, nw) };
}

/** FramePoints for an axis-aligned rect — identical to the classic eight
 * bounds handles. */
export function framePointsFromRect(b: Rect): FramePoints {
	return {
		nw: { x: b.x, y: b.y },
		n: { x: b.x + b.width / 2, y: b.y },
		ne: { x: b.x + b.width, y: b.y },
		e: { x: b.x + b.width, y: b.y + b.height / 2 },
		se: { x: b.x + b.width, y: b.y + b.height },
		s: { x: b.x + b.width / 2, y: b.y + b.height },
		sw: { x: b.x, y: b.y + b.height },
		w: { x: b.x, y: b.y + b.height / 2 }
	};
}
