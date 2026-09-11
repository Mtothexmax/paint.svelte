// Layer: render (pure maths). Flat rotation gizmo for the Move-Pixels ROTATE
// sub-mode: three colour- AND shape-coded handles around the pivot —
//   green vertical line   → tip forward/back  (rotation about X),
//   blue horizontal line  → turn left/right   (rotation about Y),
//   red circle            → spin in the plane (rotation about Z).
// The tool keeps a 3×3 rotation matrix; dragging a handle projects the pointer
// travel onto the handle's tangent and maps arc length to angle, so every grab
// point on a handle behaves the same way.
//
// The rotated plane is projected with a weak perspective camera, so a purely
// in-plane (Z) rotation is undistorted while X/Y rotations foreshorten the
// content — the 4 projected corners are then fed to the same corner-pin
// (homography) path the Distort sub-mode uses.

import type { Point, Rect } from '../../core/geometry';
import type { DistortQuad } from './distortLogic';

export type Axis3 = 'x' | 'y' | 'z';

/** Row-major 3×3 matrix. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export const IDENTITY3: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Axis order used by the handle drawing / hit-testing: X, Y, Z. */
export const AXES3: readonly Axis3[] = ['x', 'y', 'z'];

/** Handle colours — keyed by the rotation axis each handle drives. */
export const AXIS_COLORS: Record<Axis3, string> = {
	x: '#7ac74f', // green — vertical tip line
	y: '#4a90e2', // blue — horizontal turn line
	z: '#e5534b' // red — in-plane spin circle
};

export function mul3(a: Mat3, b: Mat3): Mat3 {
	const out = new Array<number>(9) as Mat3;
	for (let r = 0; r < 3; r++) {
		for (let c = 0; c < 3; c++) {
			out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
		}
	}
	return out;
}

export function isIdentity3(m: Mat3): boolean {
	return m.every((v, i) => v === IDENTITY3[i]);
}

export function apply3(m: Mat3, v: Vec3): Vec3 {
	return {
		x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
		y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
		z: m[6] * v.x + m[7] * v.y + m[8] * v.z
	};
}

/** Rotation about a coordinate axis (right-handed). */
export function rotationAxis3(axis: Axis3, angle: number): Mat3 {
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	if (axis === 'x') return [1, 0, 0, 0, c, -s, 0, s, c];
	if (axis === 'y') return [c, 0, s, 0, 1, 0, -s, 0, c];
	return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/** Rodrigues rotation about an arbitrary unit axis. */
export function rotationAboutAxis3(axis: Vec3, angle: number): Mat3 {
	const { x, y, z } = axis;
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	const t = 1 - c;
	return [
		t * x * x + c,
		t * x * y - s * z,
		t * x * z + s * y,
		t * x * y + s * z,
		t * y * y + c,
		t * y * z - s * x,
		t * x * z - s * y,
		t * y * z + s * x,
		t * z * z + c
	];
}

/** Weak perspective: camera at `distance` on +Z, focal length = distance, so
 * z = 0 maps 1:1 and points that move towards the camera grow. */
export function project3(v: Vec3, distance: number): Point {
	const denom = distance - v.z;
	const s = Math.abs(denom) < 1e-6 ? 1 : distance / denom;
	return { x: v.x * s, y: v.y * s };
}

/** One draggable rotate handle: the drawn polyline plus, for the straight
 * handles, the nominal radius used as the drag sensitivity. A grab near the
 * middle of a line sits almost ON the centre, so measuring the radius from
 * the grab point would turn tiny drags into wild spins — the line's own
 * half-length keeps the sensitivity constant instead. The circle keeps the
 * measured grab distance (≈ the radius everywhere on it). */
export interface RotateRing {
	axis: Axis3;
	points: Point[];
	grabRadius?: number;
}

/** Wraps a signed radian difference to (-π, π]. The spin handle accumulates
 * these per-frame deltas, so circling the pointer keeps turning the content
 * for as many revolutions as the gesture lasts instead of rocking it back
 * and forth past the grab point's tangent. */
export function wrapPi(d: number): number {
	const TAU = Math.PI * 2;
	return ((((d + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
}

/** Face-on circle in image space (the red in-plane spin handle). */
export function circlePoints(center: Point, radius: number, segments = 72): Point[] {
	const points: Point[] = [];
	for (let i = 0; i < segments; i++) {
		const t = (i / segments) * Math.PI * 2;
		points.push({ x: center.x + Math.cos(t) * radius, y: center.y + Math.sin(t) * radius });
	}
	return points;
}

/** Straight diameter handle through `center`, from -radius to +radius.
 * Sampled as an open polyline; `hitRing` closes it, which just retraces the
 * same segment, and `ringTangent` yields the line direction everywhere on it. */
export function linePoints(center: Point, radius: number, horizontal: boolean, segments = 24): Point[] {
	const points: Point[] = [];
	for (let i = 0; i <= segments; i++) {
		const d = -radius + (2 * radius * i) / segments;
		points.push(horizontal ? { x: center.x + d, y: center.y } : { x: center.x, y: center.y + d });
	}
	return points;
}

/** Camera distance for the content projection, as a multiple of the selection
 * size — the larger, the weaker the perspective foreshortening. */
export const PERSPECTIVE_STRENGTH = 3;

/**
 * The four projected corners of the selection rectangle after the 3D rotation.
 * `bounds` is the UNtransformed selection box; pivot/scale/offset are applied
 * in image space (pivot stays the rotation centre).
 */
export function quadFromRotation3(
	bounds: Rect,
	pivot: Point,
	scaleX: number,
	scaleY: number,
	rotation: Mat3,
	offset: Point = { x: 0, y: 0 },
	distance = Math.max(bounds.width, bounds.height) * PERSPECTIVE_STRENGTH || 1
): DistortQuad {
	const corner = (x: number, y: number): Point => {
		const local: Vec3 = { x: (x - pivot.x) * scaleX, y: (y - pivot.y) * scaleY, z: 0 };
		const p = project3(apply3(rotation, local), distance);
		return { x: pivot.x + offset.x + p.x, y: pivot.y + offset.y + p.y };
	};
	return {
		nw: corner(bounds.x, bounds.y),
		ne: corner(bounds.x + bounds.width, bounds.y),
		se: corner(bounds.x + bounds.width, bounds.y + bounds.height),
		sw: corner(bounds.x, bounds.y + bounds.height)
	};
}

/** The three rotate handles around `center`, ALWAYS in the unrotated gizmo frame.
 *
 * The handles stay put while the content turns, so you can keep dragging the
 * same one — and a fixed handle is what keeps the drag sensitivity constant
 * for the whole gesture. `rot3` rotates the content only — never this. */
export function rotateRingsFor(center: Point, radius: number): RotateRing[] {
	return [
		{ axis: 'x', points: linePoints(center, radius, false), grabRadius: radius },
		{ axis: 'y', points: linePoints(center, radius, true), grabRadius: radius },
		{ axis: 'z', points: circlePoints(center, radius) }
	];
}

/** Radius of the rotate gizmo for a selection of this size.
 *
 * Deliberately derived from the UNrotated selection box: if it came from the
 * projected quad it would shrink and grow as the content tips through X/Y, so
 * the handles would resize mid-gesture and the arc-length-to-angle mapping
 * would drift with them. */
export function gizmoRadiusFor(bounds: Rect, scaleX = 1, scaleY = 1): number {
	return Math.max(bounds.width * scaleX, bounds.height * scaleY) * 0.6 || 40;
}

export interface RingHit {
	axis: Axis3;
	index: number;
	distance: number;
}

/** Nearest point of a ring polyline to `p` (image space). */
export function hitRing(points: Point[], p: Point): { index: number; distance: number } {
	let best = { index: 0, distance: Infinity };
	for (let i = 0; i < points.length; i++) {
		const a = points[i];
		const b = points[(i + 1) % points.length];
		const d = distanceToSegment(p, a, b);
		if (d < best.distance) best = { index: i, distance: d };
	}
	return best;
}

/** Which ring (if any) is under the pointer; ties resolve in axis order. */
export function pickRing(rings: Array<{ axis: Axis3; points: Point[] }>, p: Point, threshold: number): RingHit | null {
	let best: RingHit | null = null;
	for (const ring of rings) {
		const hit = hitRing(ring.points, p);
		if (hit.distance > threshold) continue;
		if (!best || hit.distance < best.distance - 1e-6) best = { axis: ring.axis, index: hit.index, distance: hit.distance };
	}
	return best;
}

/** Unit tangent of a closed polyline at `index` (image space). */
export function ringTangent(points: Point[], index: number): Point {
	const a = points[(index - 1 + points.length) % points.length];
	const b = points[(index + 1) % points.length];
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const len = Math.hypot(dx, dy) || 1;
	return { x: dx / len, y: dy / len };
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
	let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
