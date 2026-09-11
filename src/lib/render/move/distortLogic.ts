// Layer: render (pixi). DISTORT sub-mode of the Move-Pixels tool.
//
//   • four independent corner draggers (nw / ne / se / sw) that can each be
//     moved on their own,
//   • the floating pixels are warped by the homography (projective map) that
//     sends the original quad to the dragged quad, so the image always
//     stretches to match the four points — i.e. a perspective "corner-pin".
//
// The homography is only usable while the quad stays convex and correctly
// wound — see `isConvexQuad`. MoveEngine clamps every drag with that
// predicate, otherwise a corner pulled "inward" makes the warp explode across
// the canvas.
//
// Only the SELECTION rectangle is ever warped (the mask is cropped to the
// selection bounds first), so the source rect and the corner-pin quad are the
// same size and the map is always finite for a convex quad.

import type { Point, Rect } from '../../core/geometry';
import { cloneTransform, type TransformGesture, type TransformState } from './types';

export type DistortCorner = 'nw' | 'ne' | 'se' | 'sw';

export const DISTORT_CORNERS: readonly DistortCorner[] = ['nw', 'ne', 'se', 'sw'];

/** The four draggable points, in image space. */
export interface DistortQuad {
	nw: Point;
	ne: Point;
	se: Point;
	sw: Point;
}

/** Corner order used by the homography solver (must match DistortQuad keys). */
const QUAD_ORDER: readonly DistortCorner[] = ['nw', 'ne', 'se', 'sw'];

/** The quad as it looks right now: the selection bounds pushed through the
 * current transform (identity while nothing is transformed yet). */
export function quadFromBounds(b: Rect): DistortQuad {
	return {
		nw: { x: b.x, y: b.y },
		ne: { x: b.x + b.width, y: b.y },
		se: { x: b.x + b.width, y: b.y + b.height },
		sw: { x: b.x, y: b.y + b.height }
	};
}

export function cloneQuad(q: DistortQuad): DistortQuad {
	return { nw: { ...q.nw }, ne: { ...q.ne }, se: { ...q.se }, sw: { ...q.sw } };
}

/** Hit-test the four draggers (image-space threshold). */
export function cornerAt(q: DistortQuad, p: Point, threshold: number): DistortCorner | null {
	for (const key of DISTORT_CORNERS) {
		const c = q[key];
		if (Math.hypot(p.x - c.x, p.y - c.y) <= threshold) return key;
	}
	return null;
}

/** Moves one corner of the quad (step 2 will drive the warp with this). */
export function moveCorner(q: DistortQuad, corner: DistortCorner, p: Point): DistortQuad {
	const next = cloneQuad(q);
	next[corner] = { x: p.x, y: p.y };
	return next;
}

/** Row-major 3×3 projective map (destination = H · source). */
export interface Homography {
	h: [number, number, number, number, number, number, number, number, number];
}

/**
 * Homography that maps `src` onto `dst` (the four-point "corner pin").
 * Solves the 8×8 linear system with Gauss–Jordan elimination. Returns null
 * when the quad is degenerate (collinear / zero area) and no map exists.
 *
 * NOTE: implemented but NOT yet used — the renderer still warps with the
 * affine (pivot/scale/rotation/skew) path only.
 */
export function computeHomography(src: DistortQuad, dst: DistortQuad): Homography | null {
	const a: number[][] = [];
	const y: number[] = [];
	for (let i = 0; i < 4; i++) {
		const s = src[QUAD_ORDER[i]];
		const d = dst[QUAD_ORDER[i]];
		a.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
		y.push(d.x);
		a.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
		y.push(d.y);
	}
	const m = a.map((row, i) => [...row, y[i]]);
	for (let col = 0; col < 8; col++) {
		let pivot = col;
		for (let r = col + 1; r < 8; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
		if (Math.abs(m[pivot][col]) < 1e-12) return null;
		[m[col], m[pivot]] = [m[pivot], m[col]];
		const inv = 1 / m[col][col];
		for (let c = col; c < 9; c++) m[col][c] *= inv;
		for (let r = 0; r < 8; r++) {
			if (r === col) continue;
			const f = m[r][col];
			if (f === 0) continue;
			for (let c = col; c < 9; c++) m[r][c] -= f * m[col][c];
		}
	}
	const h = m.map((row) => row[8]);
	return { h: [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1] };
}

/** Applies a homography to a point (used by hit-testing and by the future
 * per-pixel warp). */
export function applyHomography(h: Homography, p: Point): Point {
	const [a, b, c, d, e, f, g, i, j] = h.h;
	const w = g * p.x + i * p.y + j || 1;
	return { x: (a * p.x + b * p.y + c) / w, y: (d * p.x + e * p.y + f) / w };
}

/**
 * Inverse of a homography — maps a warped (destination) point back into the
 * source space. Used to hit-test the floating selection while it is warped.
 * Returns null when the map collapses (degenerate quad).
 */
export function invertHomography(h: Homography): Homography | null {
	const [a, b, c, d, e, f, g, i, j] = h.h;
	const det = a * (e * j - f * i) - b * (d * j - f * g) + c * (d * i - e * g);
	if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
	const inv = 1 / det;
	return {
		h: [
			(e * j - f * i) * inv,
			(c * i - b * j) * inv,
			(b * f - c * e) * inv,
			(f * g - d * j) * inv,
			(a * j - c * g) * inv,
			(c * d - a * f) * inv,
			(d * i - e * g) * inv,
			(b * g - a * i) * inv,
			(a * e - b * d) * inv
		]
	};
}

/**
 * Legacy distort gesture: corner/edge handles shear about the pivot
 * (Photoshop skew style) instead of scaling. Kept so the shipped Distort
 * option keeps working until the 4-dragger warp replaces it.
 *
 * North/south handles shear X with the pointer's horizontal travel (sign
 * flips so dragging right always slants right); east/west handles shear Y
 * with the vertical travel. Corners do both.
 */
export function distortTo(g: TransformGesture, p: Point, b: Rect): TransformState {
	const start = g.start;
	const next = cloneTransform(start);
	const dx = p.x - g.origin.x;
	const dy = p.y - g.origin.y;
	const clampSkew = (v: number) => Math.max(-1, Math.min(1, v));
	if (g.handle.includes('n') || g.handle.includes('s')) {
		const s = g.handle.includes('n') ? -1 : 1;
		next.skewX = clampSkew(start.skewX + (dx / (b.height || 1)) * s);
	}
	if (g.handle.includes('e') || g.handle.includes('w')) {
		const s = g.handle.includes('e') ? 1 : -1;
		next.skewY = clampSkew(start.skewY + (dy / (b.width || 1)) * s);
	}
	return next;
}

/** True when the transform carries a non-identity shear (used by drop()). */
export function hasShear(s: TransformState): boolean {
	return s.skewX !== 0 || s.skewY !== 0;
}

/** Corner order used everywhere the quad is consumed as a list (clockwise
 * from the top-left): nw → ne → se → sw. */
export function quadPoints(q: DistortQuad): [Point, Point, Point, Point] {
	return [q.nw, q.ne, q.se, q.sw];
}

export function quadFromPoints(points: [Point, Point, Point, Point]): DistortQuad {
	return { nw: { ...points[0] }, ne: { ...points[1] }, se: { ...points[2] }, sw: { ...points[3] } };
}

/** Signed area of the quad (shoelace). Positive when the winding matches the
 * source rectangle (nw → ne → se → sw, clockwise in image space). */
export function quadArea(q: DistortQuad): number {
	const p = quadPoints(q);
	let a = 0;
	for (let i = 0; i < 4; i++) {
		const c = p[i];
		const n = p[(i + 1) % 4];
		a += c.x * n.y - n.x * c.y;
	}
	return a / 2;
}

function crossZ(a: Point, b: Point, c: Point): number {
	return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
}

/**
 * A quad is RENDERABLE when it is strictly convex and keeps the winding of
 * the source rectangle. As soon as a corner is pulled "inward" past the
 * opposite edge the quad turns concave (or self-intersects, or flips) — the
 * homography then sends part of the source plane through infinity and the
 * mesh explodes across the whole canvas. Dragging must be clamped to the
 * convex / correctly-wound region.
 */
export function isConvexQuad(q: DistortQuad): boolean {
	return quadConvexWinding(q) > 0;
}

/**
 * Strictly convex with CONSISTENT winding in either direction: +1 for the
 * source winding, -1 for uniformly mirrored, 0 for concave / degenerate /
 * self-intersecting. The rotate sub-mode revolves the content through
 * edge-on, so the back half of every turn is mirrored — still bijective,
 * still renderable. Distort keeps the stricter `isConvexQuad`: pulling one
 * corner through flips only part of the mesh.
 */
export function quadConvexWinding(q: DistortQuad): number {
	const p = quadPoints(q);
	let sign = 0;
	for (let i = 0; i < 4; i++) {
		const c = crossZ(p[i], p[(i + 1) % 4], p[(i + 2) % 4]);
		if (!Number.isFinite(c) || Math.abs(c) < 1e-9) return 0; // collinear / degenerate
		const s = c > 0 ? 1 : -1;
		if (sign === 0) sign = s;
		else if (s !== sign) return 0;
	}
	return sign;
}

/** Cross-fade between two quads (used to walk a drag back to a safe pose). */
export function lerpQuad(a: DistortQuad, b: DistortQuad, t: number): DistortQuad {
	const at = (p: Point, q: Point): Point => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
	return { nw: at(a.nw, b.nw), ne: at(a.ne, b.ne), se: at(a.se, b.se), sw: at(a.sw, b.sw) };
}

/** The quad with one corner replaced. */
export function withCorner(q: DistortQuad, corner: DistortCorner, p: Point): DistortQuad {
	const next = cloneQuad(q);
	next[corner] = { x: p.x, y: p.y };
	return next;
}

/** Shifts all four corners (the quad is stored in final image space). */
export function translateQuad(q: DistortQuad, dx: number, dy: number): DistortQuad {
	return {
		nw: { x: q.nw.x + dx, y: q.nw.y + dy },
		ne: { x: q.ne.x + dx, y: q.ne.y + dy },
		se: { x: q.se.x + dx, y: q.se.y + dy },
		sw: { x: q.sw.x + dx, y: q.sw.y + dy }
	};
}

/** Corner key from a transform handle ('nw' | 'ne' | 'se' | 'sw'); null for
 * the edge handles, which the distort sub-mode does not expose. */
export function cornerFromHandle(handle: string): DistortCorner | null {
	return handle === 'nw' || handle === 'ne' || handle === 'se' || handle === 'sw' ? handle : null;
}

/**
 * Homography that maps the selection rectangle onto the dragged quad — the
 * corner-pin warp the distort sub-mode applies to the floating pixels, the
 * mask and the marching ants.
 */
export function homographyForQuad(bounds: Rect, quad: DistortQuad): Homography | null {
	return computeHomography(quadFromBounds(bounds), quad);
}
