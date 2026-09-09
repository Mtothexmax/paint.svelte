// Layer: render (pixi). ROTATE sub-mode of the Move-Pixels tool — the former
// "transform" logic (todo3 renamed it): rotate about the pivot, scale from the
// corner/edge handles, drag the pivot, and translate (the rotate mode must
// still allow moving the selection).
//
// Extracted 1:1 from MoveEngine; pure maths so the engine keeps only the
// session state. `rotate` also owns the affine helpers the engine needs for
// hit-testing around the pivot.

import type { Point, Rect } from '../../core/geometry';
import { clampScale, cloneTransform, type TransformGesture, type TransformState } from './types';

export interface RotateOptions {
	/** Snap the angle to 10° steps. */
	shift?: boolean;
	/** Scale from the centre instead of the opposite anchor. */
	alt?: boolean;
}

const TEN_DEGREES = Math.PI / 18;

/** Round an angle to the nearest 10° step (shift-drag). */
export function snapRotation(angle: number): number {
	return Math.round((angle * 180) / Math.PI / 10) * TEN_DEGREES;
}

/** Maps an image point back through `state` (inverse of the affine the
 * renderer applies), so a scale drag can be expressed in untransformed
 * selection space. */
export function inverseTransformPoint(p: Point, state: TransformState): Point {
	const dx = p.x - state.pivot.x - state.offset.x;
	const dy = p.y - state.pivot.y - state.offset.y;
	const cos = Math.cos(state.rotation);
	const sin = Math.sin(state.rotation);
	return {
		x: state.pivot.x + (dx * cos + dy * sin) / (state.scaleX || 1),
		y: state.pivot.y + (-dx * sin + dy * cos) / (state.scaleY || 1)
	};
}

/** Offset that keeps the pixels visually still while the pivot moves. */
export function offsetForPivot(nextPivot: Point, previousPivot: Point, offset: Point, state: TransformState): Point {
	const cos = Math.cos(state.rotation);
	const sin = Math.sin(state.rotation);
	const transformedDelta = {
		x: (nextPivot.x - previousPivot.x) * state.scaleX * cos - (nextPivot.y - previousPivot.y) * state.scaleY * sin,
		y: (nextPivot.x - previousPivot.x) * state.scaleX * sin + (nextPivot.y - previousPivot.y) * state.scaleY * cos
	};
	return {
		x: offset.x + previousPivot.x - nextPivot.x + transformedDelta.x,
		y: offset.y + previousPivot.y - nextPivot.y + transformedDelta.y
	};
}

/** Next transform for a rotate-mode gesture at pointer `p`.
 * Handles: 'move' (translate), 'pivot', 'rotate' and the eight scale grips. */
export function rotateTo(g: TransformGesture, p: Point, b: Rect, opts: RotateOptions = {}): TransformState {
	const start = g.start;
	const next = cloneTransform(start);

	if (g.handle === 'move') {
		next.offset = {
			x: start.offset.x + Math.round(p.x - g.origin.x),
			y: start.offset.y + Math.round(p.y - g.origin.y)
		};
		return next;
	}

	if (g.handle === 'pivot') {
		// The pivot marker is displayed at pivot + offset. Keep the transform
		// offset fixed so moving this UI control does not move the pixels.
		const dx = p.x - (start.pivot.x + start.offset.x);
		const dy = p.y - (start.pivot.y + start.offset.y);
		const cos = Math.cos(start.rotation);
		const sin = Math.sin(start.rotation);
		const scaledX = dx * cos + dy * sin;
		const scaledY = -dx * sin + dy * cos;
		next.pivot = {
			x: start.pivot.x + scaledX / (start.scaleX || 1),
			y: start.pivot.y + scaledY / (start.scaleY || 1)
		};
		next.offset = offsetForPivot(next.pivot, start.pivot, start.offset, start);
		return next;
	}

	if (g.handle === 'rotate') {
		const center = { x: start.pivot.x + start.offset.x, y: start.pivot.y + start.offset.y };
		const angle = Math.atan2(p.y - center.y, p.x - center.x);
		const startAngle = Math.atan2(g.origin.y - center.y, g.origin.x - center.x);
		const rotation = start.rotation + angle - startAngle;
		next.rotation = opts.shift ? snapRotation(rotation) : rotation;
		return next;
	}

	// --- corner / edge handles: scale about the opposite anchor -----------
	const anchorX = g.handle.includes('w') ? b.x + b.width : g.handle.includes('e') ? b.x : b.x + b.width / 2;
	const anchorY = g.handle.includes('n') ? b.y + b.height : g.handle.includes('s') ? b.y : b.y + b.height / 2;
	const localPointer = inverseTransformPoint(p, start);
	const movingX = g.handle.includes('w') ? b.x : g.handle.includes('e') ? b.x + b.width : anchorX;
	const movingY = g.handle.includes('n') ? b.y : g.handle.includes('s') ? b.y + b.height : anchorY;
	let sx =
		g.handle.includes('w') || g.handle.includes('e')
			? start.scaleX + ((localPointer.x - movingX) / (movingX - anchorX)) * start.scaleX
			: start.scaleX;
	let sy =
		g.handle.includes('n') || g.handle.includes('s')
			? start.scaleY + ((localPointer.y - movingY) / (movingY - anchorY)) * start.scaleY
			: start.scaleY;
	if (opts.shift) {
		const magnitude = Math.max(Math.abs(sx), Math.abs(sy));
		if (g.handle === 'n' || g.handle === 's') sx = Math.sign(sx || 1) * Math.abs(sy);
		else if (g.handle === 'e' || g.handle === 'w') sy = Math.sign(sy || 1) * Math.abs(sx);
		else {
			sx = Math.sign(sx || 1) * magnitude;
			sy = Math.sign(sy || 1) * magnitude;
		}
	}
	next.scaleX = clampScale(sx);
	next.scaleY = clampScale(sy);
	if (opts.alt) {
		next.offset = { ...start.offset };
	} else {
		const cos = Math.cos(start.rotation);
		const sin = Math.sin(start.rotation);
		const fixedX = (anchorX - start.pivot.x) * (start.scaleX - next.scaleX);
		const fixedY = (anchorY - start.pivot.y) * (start.scaleY - next.scaleY);
		next.offset = {
			x: start.offset.x + fixedX * cos - fixedY * sin,
			y: start.offset.y + fixedX * sin + fixedY * cos
		};
	}
	return next;
}

/** Next transform after the pivot is set directly (reset-pivot action). */
export function pivotTo(state: TransformState, p: Point): TransformState {
	const next = cloneTransform(state);
	next.offset = offsetForPivot(p, state.pivot, state.offset, state);
	next.pivot = { x: p.x, y: p.y };
	return next;
}
