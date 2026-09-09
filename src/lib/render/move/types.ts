// Layer: render (pixi). Shared vocabulary of the Move-Pixels tool modes.
// Pure data + tiny helpers — no renderer, no document access, so the mode
// modules below stay testable in isolation.
//
// Split (todo3): the Move-Pixels tool used to keep its move AND its transform
// maths inside MoveEngine. The move maths now lives in `moveLogic.ts`, the
// rotate/scale/pivot maths in `rotateLogic.ts` and the (placeholder) 4-corner
// warp in `distortLogic.ts`. MoveEngine only owns the session (lift / float /
// drop / commit) and delegates every gesture to those modules.

import type { Point, Rect } from '../../core/geometry';
import type { MoveToolMode } from '../../core/toolMode';

export type { MoveToolMode };

/** Draggable control points of the transform overlay. */
export type TransformHandle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'pivot' | 'rotate';

/** Corner + edge handles (the eight scale/shear grips). */
export const SCALE_HANDLES: readonly TransformHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Live transform of the floating selection. Angles are radians, skew is a
 * tangent-like factor (see SurfaceStore.blitTransformed). */
export interface TransformState {
	pivot: Point;
	offset: Point;
	scaleX: number;
	scaleY: number;
	rotation: number;
	skewX: number;
	skewY: number;
}

/** Never let a scale factor reach 0 — a collapsed axis cannot be inverted. */
export const MIN_SCALE = 0.001;

export function clampScale(v: number): number {
	if (Math.abs(v) < MIN_SCALE) return v < 0 ? -MIN_SCALE : MIN_SCALE;
	return v;
}

export function identityTransform(pivot: Point): TransformState {
	return { pivot: { ...pivot }, offset: { x: 0, y: 0 }, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 };
}

export function cloneTransform(s: TransformState): TransformState {
	return {
		pivot: { ...s.pivot },
		offset: { ...s.offset },
		scaleX: s.scaleX,
		scaleY: s.scaleY,
		rotation: s.rotation,
		skewX: s.skewX,
		skewY: s.skewY
	};
}

export function isScaleHandle(h: TransformHandle): boolean {
	return SCALE_HANDLES.includes(h);
}

/** The handle that translates the whole floating selection. */
export function isTranslationHandle(h: TransformHandle): boolean {
	return h === 'move';
}

/** A gesture: which handle is being dragged, where it started and the
 * transform at that moment. Every mode module maps gesture + pointer to the
 * next TransformState. */
export interface TransformGesture {
	handle: TransformHandle;
	origin: Point;
	start: TransformState;
}

export function beginGesture(handle: TransformHandle, p: Point, state: TransformState): TransformGesture {
	return { handle, origin: { x: p.x, y: p.y }, start: cloneTransform(state) };
}

/** Current transform of a session, in the shape the gesture modules need. */
export function stateOf(pivot: Point, offset: Point, scaleX: number, scaleY: number, rotation: number, skewX = 0, skewY = 0): TransformState {
	return { pivot: { ...pivot }, offset: { ...offset }, scaleX, scaleY, rotation, skewX, skewY };
}

/** Bounding box fallback used when a session has no bounds yet. */
export function docBounds(width: number, height: number): Rect {
	return { x: 0, y: 0, width, height };
}
