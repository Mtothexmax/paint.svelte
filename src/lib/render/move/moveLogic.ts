// Layer: render (pixi). MOVE sub-mode of the Move-Pixels tool — pure
// translation of the floating selection (and of the selection outline/tint
// that travels with it). Extracted from MoveEngine (todo3): everything here
// is maths on Points, so the engine only has to apply the result.

import type { Point } from '../../core/geometry';

/** A translation gesture: press point + the offset the drag started from. */
export interface MoveGesture {
	origin: Point;
	baseOffset: Point;
}

/** Arms a translation drag at image point `p`. Integer press point: the
 * floating pixels snap to whole image pixels, like the old engine did. */
export function beginMove(p: Point, offset: Point): MoveGesture {
	return { origin: { x: Math.round(p.x), y: Math.round(p.y) }, baseOffset: { x: offset.x, y: offset.y } };
}

/** Offset for pointer position `p` during a translation drag. */
export function moveTo(g: MoveGesture, p: Point): Point {
	return {
		x: g.baseOffset.x + Math.round(p.x - g.origin.x),
		y: g.baseOffset.y + Math.round(p.y - g.origin.y)
	};
}

/** Arrow-key nudge: whole image pixels, accumulated on the current offset. */
export function nudge(offset: Point, dx: number, dy: number): Point {
	return { x: offset.x + Math.round(dx), y: offset.y + Math.round(dy) };
}

export function sameOffset(a: Point, b: Point): boolean {
	return a.x === b.x && a.y === b.y;
}
