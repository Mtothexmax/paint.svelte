// Layer: render (pure math — no pixi symbols needed here). Image-space affine
// transform shared by the move pipeline: pivot + offset + scale + rotation +
// skew. The matrix matches Pixi v8 sprite semantics EXACTLY (Matrix.setTransform:
// a = cos(rotation + skewY) * scaleX, b = sin(rotation + skewY) * scaleX,
// c = -sin(rotation - skewX) * scaleY, d = cos(rotation - skewX) * scaleY),
// so handles, outlines, hit-tests and the GPU sprites always agree.

import type { Point } from '../core/geometry';

export interface AffineState {
	pivot: Point;
	offset: Point;
	scaleX: number;
	scaleY: number;
	rotation: number; // radians
	skewX: number; // radians
	skewY: number; // radians
}

/** Transforms an image-space point (skew 0 = the legacy scale/rotate path). */
export function affinePoint(s: AffineState, p: Point): Point {
	const lx = p.x - s.pivot.x;
	const ly = p.y - s.pivot.y;
	const a = Math.cos(s.rotation + s.skewY) * s.scaleX;
	const b = Math.sin(s.rotation + s.skewY) * s.scaleX;
	const c = -Math.sin(s.rotation - s.skewX) * s.scaleY;
	const d = Math.cos(s.rotation - s.skewX) * s.scaleY;
	return {
		x: s.pivot.x + s.offset.x + a * lx + c * ly,
		y: s.pivot.y + s.offset.y + b * lx + d * ly
	};
}
