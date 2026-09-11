// Layer: render (pixi). Move-tool engine, Paint.NET style: the first drag
// INSIDE the selection lifts the selected pixels into a floating preview
// (through the mask) and erases them from the layer; the floating content can
// then be re-dragged any number of times. NOTHING is written to the document
// until the selection is DROPPED — click outside the selection, Enter, or a
// tool switch — which commits pixels + selection (mask + geometry) as ONE
// undoable step. Escape cancels and restores the original state. Works for
// any selection the mask can express: simple shapes, complements (donuts) and
// combined add/subtract regions.
//
// Sub-modes (todo3): this class owns the SESSION (lift → float → drop/commit,
// hit-testing, previews). The gesture maths lives in ./move, one file per
// sub-mode:
//   • move/moveLogic.ts    — translate (move)
//   • move/rotateLogic.ts  — rotate / scale / pivot (formerly "transform")
//   • move/distortLogic.ts — 4-corner warp: dragger quad + homography
//   • move/gizmo3d.ts      — flat rotation handles for the rotate mode
//
// Rotate and Distort are PROJECTIVE (a four-corner pin), so they cannot run
// through the affine sprite path: while either is active the engine keeps a
// base quad (`warpQuad`) plus an optional 3D rotation (`rot3`) and renders /
// commits the floating pixels, the mask and the ants through the homography
// that maps the selection box onto the resulting quad.

import { Rectangle, Sprite } from 'pixi.js';
import type { Point, Rect } from '../core/geometry';
import { framePointsFromLoops, type FramePoints } from '../core/geometry';
import type { MoveToolMode } from '../core/toolMode';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { Layer, SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { affinePoint } from './affine';
import { blitMaskedInto, boundsOfLoops, complementMaskSurface, eraseSelectionRegion } from './selection';
import { logTransformDebug } from './transformDebug';
// Sub-mode modules (todo3): pure gesture maths, one file per mode.
import { beginMove, moveTo as translateTo, nudge as nudgeOffset, sameOffset, type MoveGesture } from './move/moveLogic';
import { pivotTo, rotateTo, snapRotation } from './move/rotateLogic';
import {
	applyHomography,
	invertHomography,
	isConvexQuad,
	lerpQuad,
	cloneQuad,
	cornerFromHandle,
	homographyForQuad,
	quadArea,
	quadConvexWinding,
	quadFromBounds,
	quadPoints,
	translateQuad,
	withCorner,
	type DistortCorner,
	type DistortQuad
} from './move/distortLogic';
import {
	IDENTITY3,
	apply3,
	gizmoRadiusFor,
	hitRing,
	isIdentity3,
	mul3,
	project3,
	ringTangent,
	rotateRingsFor,
	rotationAxis3,
	wrapPi,
	type Axis3,
	type Mat3,
	type RotateRing
} from './move/gizmo3d';
import { beginGesture, isTranslationHandle, ringAxis, type TransformGesture, type TransformHandle, type TransformState } from './move/types';

export type MoveBeginResult = 'ok' | 'none';
/** Re-exported so the canvas / pointer layers keep their existing imports. */
export type { TransformHandle } from './move/types';
export type { MoveToolMode } from '../core/toolMode';

export class MoveEngine {
	private renderer: EditorRenderer;

	// session state — valid while `active` (floating or being dragged)
	private doc: ImageDocument | null = null;
	private layer: Layer | null = null;
	private beforeId: SurfaceId | null = null;
	private erasedId: SurfaceId | null = null;
	private floatingId: SurfaceId | null = null;
	private previewId: SurfaceId | null = null;
	private bounds: Rect | null = null;
	private offset: Point = { x: 0, y: 0 };
	private pivot: Point = { x: 0, y: 0 };
	private scaleX = 1;
	private scaleY = 1;
	private rotation = 0;
	/** Shear factors (distort mode — see ./move/distortLogic). */
	private skewX = 0;
	private skewY = 0;
	/** Active sub-mode: 'move' | 'rotate' | 'distort' (options strip). */
	private mode: MoveToolMode = 'move';

	// --- projective (rotate / distort) state ------------------------------
	/** Base quad in image space (corners of the selection box once a
	 * projective sub-mode took over). Null while the affine path is in use. */
	private warpQuad: DistortQuad | null = null;
	/** 3D rotation of the rotate sub-mode (flat axis handles). */
	private rot3: Mat3 = IDENTITY3;
	/** Ring drag in flight. `tangent`/`radius`/`origin` drive the straight
	 * tip/turn handles; `center`/`lastAngle`/`spun` accumulate the spin
	 * handle's revolutions around the pivot. */
	private ringGesture: {
		axis: Axis3;
		index: number;
		origin: Point;
		tangent: Point;
		radius: number;
		center: Point;
		lastAngle: number;
		spun: number;
		startRotation: Mat3;
	} | null = null;

	// drag-in-flight state. The maths lives in ./move/* — here we only keep
	// the gesture object the active mode module needs.
	private origin: Point | null = null; // press point of the current drag
	private moveGesture: MoveGesture | null = null;
	private transformGesture: TransformGesture | null = null;
	private active = false;

	constructor(renderer: EditorRenderer) {
		this.renderer = renderer;
	}

	/** True while a lifted (floating) selection exists — dropped only via drop(). */
	get floating(): boolean {
		return this.active;
	}

	get transformState(): { bounds: Rect; pivot: Point; offset: Point; scaleX: number; scaleY: number; rotation: number; skewX: number; skewY: number } | null {
		if (!this.bounds) return null;
		return {
			bounds: { ...this.bounds },
			pivot: { ...this.pivot },
			offset: { ...this.offset },
			scaleX: this.scaleX,
			scaleY: this.scaleY,
			rotation: this.rotation,
			skewX: this.skewX,
			skewY: this.skewY
		};
	}

	/** Selects the sub-mode ('move' | 'rotate' | 'distort') — decides which
	 * module in ./move handles the corner/edge grips. Switching into a
	 * projective sub-mode bakes the current affine transform into the warp
	 * quad, so the pixels never jump. */
	setMode(v: MoveToolMode): void {
		const changed = v !== this.mode;
		this.mode = v;
		if (!changed || !this.active || !this.bounds) return;
		if (v === 'rotate' || v === 'distort') {
			if (!this.warpQuad) {
				this.warpQuad = this.affineQuad();
				this.bakeAffineIntoQuad();
			}
		}
		if (v === 'distort') {
			// A 3D rotation is baked into the quad so the corners can be
			// dragged directly afterwards.
			const baked = this.currentQuad() ?? this.warpQuad;
			this.rot3 = IDENTITY3;
			this.warpQuad = baked && this.bounds ? this.safeQuad(baked, quadFromBounds(this.bounds)) : baked;
		}
		this.refreshVisuals();
	}

	/** Smallest renderable quad (px²) — below this the warp is pure noise. */
	private static readonly MIN_QUAD_AREA = 4;

	/**
	 * A quad may only be sent to the GPU while it stays strictly convex and
	 * keeps the winding of the source rectangle. As soon as a corner is pulled
	 * past the opposite edge the quad turns concave / self-intersecting, the
	 * corner-pin homography sends part of the source plane through infinity and
	 * the mesh covers the whole canvas ("the image explodes"). Dragging is
	 * clamped to the convex, correctly-wound region.
	 *
	 * Note: only the SELECTION rectangle is ever warped (the mask is cropped to
	 * the bounds first, see `warpMask`), so no document corner is pushed
	 * through the homography and no vanishing-line test is needed here.
	 */
	private quadIsSafe(q: DistortQuad): boolean {
		if (!isConvexQuad(q)) return false;
		if (Math.abs(quadArea(q)) < MoveEngine.MIN_QUAD_AREA) return false;
		if (!this.bounds) return true;
		return homographyForQuad(this.bounds, q) !== null;
	}

	/** Safety gate for the rotate sub-mode: like `quadIsSafe`, but revolving
	 * content shows its mirrored back half every turn, so either consistent
	 * winding passes. The exact edge-on frame has (near-)zero area and is
	 * skipped — the following frames pass again, so the revolution continues
	 * straight through instead of stopping. */
	private quadIsSafeForRotation(q: DistortQuad): boolean {
		if (quadConvexWinding(q) === 0) return false;
		if (Math.abs(quadArea(q)) < MoveEngine.MIN_QUAD_AREA) return false;
		if (!this.bounds) return true;
		return homographyForQuad(this.bounds, q) !== null;
	}

	/** Pulls `candidate` back toward the known-good quad `from` until it is
	 * renderable (binary search). A drag therefore stops at the limit instead
	 * of exploding. */
	private safeQuad(candidate: DistortQuad, from: DistortQuad): DistortQuad {
		if (this.quadIsSafe(candidate)) return candidate;
		if (!this.quadIsSafe(from)) return from;
		let lo = 0;
		let hi = 1;
		for (let i = 0; i < 18; i++) {
			const mid = (lo + hi) / 2;
			if (this.quadIsSafe(lerpQuad(from, candidate, mid))) lo = mid;
			else hi = mid;
		}
		return lerpQuad(from, candidate, lo);
	}

	get moveMode(): MoveToolMode {
		return this.mode;
	}

	/** True while the session is warped projectively (rotate / distort). */
	get warped(): boolean {
		return this.warpQuad !== null;
	}

	/** The quad the floating selection currently occupies (image space),
	 * including any translation. Null while the affine path is in use. */
	get warpCorners(): [Point, Point, Point, Point] | null {
		const q = this.currentQuad();
		return q ? quadPoints(q) : null;
	}

	/** Homography mapping the selection box onto the current quad. */
	get warpHomography(): ReturnType<typeof homographyForQuad> {
		if (!this.bounds) return null;
		const q = this.currentQuad();
		return q ? homographyForQuad(this.bounds, q) : null;
	}

	/** The three rotation handles (image space) for the overlay.
	 *
	 * Built from the UNrotated gizmo frame — see `rotateRingsFor`. `rot3` turns
	 * the content, not the handles, so the gizmo stays put while you drag. */
	get rotateRings(): RotateRing[] {
		if (!this.active || !this.bounds) return [];
		return rotateRingsFor(this.gizmoCenter(), this.gizmoRadius());
	}

	/** Corners of the selection box pushed through the affine state. */
	private affineQuad(): DistortQuad {
		const b = this.bounds ?? { x: 0, y: 0, width: 0, height: 0 };
		const s = {
			pivot: this.pivot,
			offset: this.offset,
			scaleX: this.scaleX,
			scaleY: this.scaleY,
			rotation: this.rotation,
			skewX: this.skewX,
			skewY: this.skewY
		};
		return {
			nw: affinePoint(s, { x: b.x, y: b.y }),
			ne: affinePoint(s, { x: b.x + b.width, y: b.y }),
			se: affinePoint(s, { x: b.x + b.width, y: b.y + b.height }),
			sw: affinePoint(s, { x: b.x, y: b.y + b.height })
		};
	}

	/** Bakes scale/rotation/skew/offset into `warpQuad` and resets the affine
	 * state — the quad becomes the single source of truth. */
	private bakeAffineIntoQuad(): void {
		this.offset = { x: 0, y: 0 };
		this.rotation = 0;
		this.scaleX = 1;
		this.scaleY = 1;
		this.skewX = 0;
		this.skewY = 0;
	}

	/** The quad with the 3D rotation (if any) and the translation applied. */
	private currentQuad(): DistortQuad | null {
		return this.quadForRotation(this.rot3);
	}

	/** Same as currentQuad() but for a candidate rotation — lets a ring drag
	 * be rejected BEFORE it collapses or flips the quad. */
	private quadForRotation(rot: Mat3): DistortQuad | null {
		const base = this.warpQuad;
		if (!base) return null;
		if (rot === IDENTITY3 || isIdentity3(rot)) return translateQuad(base, this.offset.x, this.offset.y);
		const distance = this.cameraDistance();
		const out = cloneQuad(base);
		for (const key of ['nw', 'ne', 'se', 'sw'] as const) {
			const c = base[key];
			const p = project3(
				apply3(rot, { x: c.x - this.pivot.x, y: c.y - this.pivot.y, z: 0 }),
				distance
			);
			out[key] = { x: this.pivot.x + this.offset.x + p.x, y: this.pivot.y + this.offset.y + p.y };
		}
		return out;
	}

	private cameraDistance(): number {
		const b = this.bounds;
		if (!b) return 1000;
		return Math.max(b.width, b.height) * 3 || 1000;
	}

	private gizmoCenter(): Point {
		return { x: this.pivot.x + this.offset.x, y: this.pivot.y + this.offset.y };
	}

	/** Ring radius. Independent of `rot3` on purpose — a radius taken from the
	 * projected quad would change as the content tips through X/Y, resizing the
	 * rings and shifting the drag sensitivity mid-gesture. */
	private gizmoRadius(): number {
		const b = this.bounds;
		if (!b) return 40;
		return gizmoRadiusFor(b, this.scaleX, this.scaleY);
	}

	/** Starts a ring drag (rotate sub-mode). */
	beginRing(axis: Axis3, p: Point): boolean {
		if (!this.active || !this.bounds) return false;
		// Same handles the overlay draws, so a click always lands on what the user
		// sees — the tangent (and therefore the sensitivity) is fixed for the
		// whole gesture along with them. Straight handles carry their nominal
		// radius: a grab near the middle of a line sits almost on the centre,
		// which would make the arc-length mapping hypersensitive.
		const ring = rotateRingsFor(this.gizmoCenter(), this.gizmoRadius()).find((r) => r.axis === axis);
		if (!ring) return false;
		const points = ring.points;
		const hit = hitRing(points, p);
		const center = this.gizmoCenter();
		const radius = ring.grabRadius ?? Math.max(1, Math.hypot(points[hit.index].x - center.x, points[hit.index].y - center.y));
		this.ringGesture = {
			axis,
			index: hit.index,
			origin: { x: p.x, y: p.y },
			tangent: ringTangent(points, hit.index),
			radius,
			center,
			lastAngle: Math.atan2(p.y - center.y, p.x - center.x),
			spun: 0,
			startRotation: this.rot3
		};
		this.origin = { ...p };
		return true;
	}

	/** Continues a ring drag.
	 *
	 * The spin handle (red circle) accumulates the pointer's wrapped angle
	 * around the pivot, so circling keeps turning the content past 360° for
	 * as many revolutions as the gesture lasts. The straight tip/turn handles
	 * keep the tangent projection: dragging along the line tips or turns the
	 * content (arc length / radius), which is the natural gesture there. */
	rotateRingTo(p: Point, shift = false): void {
		const g = this.ringGesture;
		if (!g) return;
		let delta: number;
		if (g.axis === 'z') {
			const dx = p.x - g.center.x;
			const dy = p.y - g.center.y;
			// Dead zone at the pivot: the angle is undefined there, and
			// banking noise as the reference would kick on exit.
			if (dx * dx + dy * dy < 16) return;
			const a = Math.atan2(dy, dx);
			g.spun += wrapPi(a - g.lastAngle);
			g.lastAngle = a;
			delta = shift ? snapRotation(g.spun) : g.spun;
		} else {
			const dx = p.x - g.origin.x;
			const dy = p.y - g.origin.y;
			delta = (dx * g.tangent.x + dy * g.tangent.y) / g.radius;
			if (shift) delta = snapRotation(delta);
		}
		const next = mul3(g.startRotation, rotationAxis3(g.axis, delta));
		// Reject a rotation that would collapse or flip the quad (the
		// projection would send the pixels through infinity). Mirrored quads
		// are fine here — they are the back half of the revolution.
		const probe = this.quadForRotation(next);
		if (probe && !this.quadIsSafeForRotation(probe)) return;
		this.rot3 = next;
		this.refreshVisuals();
		logTransformDebug('engine.rotateRingTo', { axis: g.axis, delta, transform: this.transformState });
	}

	/** Moves one corner of the distort quad (image space, absolute). The new
	 * pose is clamped to the renderable region, so pulling a corner "inward"
	 * stops at the limit instead of exploding the warp. */
	distortCornerTo(corner: DistortCorner, p: Point): void {
		if (!this.warpQuad) return;
		const target = { x: p.x - this.offset.x, y: p.y - this.offset.y };
		const next = this.safeQuad(withCorner(this.warpQuad, corner, target), this.warpQuad);
		this.warpQuad = next;
		this.refreshVisuals();
		logTransformDebug('engine.distortCornerTo', {
			corner,
			pointer: p,
			clamped: next[corner].x !== target.x || next[corner].y !== target.y,
			quad: this.currentQuad()
		});
	}

	/** Maps a doc-space point back into the UN-warped document while the
	 * session is projective (rotate / distort), so hit tests can use the
	 * selection mask, which never moves until the session is dropped. Falls
	 * back to the plain affine translation. */
	private unwarpPoint(p: Point): Point {
		const h = this.warpHomography;
		if (h) {
			const inv = invertHomography(h);
			if (inv) return applyHomography(inv, p);
		}
		return { x: p.x - this.offset.x, y: p.y - this.offset.y };
	}

	/** True when the current selection mask covers the given image point. A 1×1
	 * GPU read-back of the mask surface — mask-authoritative, so donut holes
	 * count as "outside". */
	pointInSelection(p: Point): boolean {
		const doc = documentRegistry.active;
		const sel = doc?.selection;
		if (!doc || !sel?.maskId || !this.renderer.surfaces.has(sel.maskId)) return false;
		const pt = this.active ? this.unwarpPoint(p) : p;
		const x = Math.floor(pt.x);
		const y = Math.floor(pt.y);
		if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return false;
		const sprite = new Sprite(this.renderer.surfaces.getTexture(sel.maskId));
		const px = this.renderer.app.renderer.extract.pixels({
			target: sprite,
			frame: new Rectangle(x, y, 1, 1),
			resolution: 1
		});
		sprite.destroy();
		return px.pixels[3] > 0;
	}

	/**
	 * Lifts the selection content of the active layer: the floating pixels are
	 * shown at the selection bounds, the layer itself shows the erased "hole".
	 * The document is NOT changed undoably until drop().
	 */
	begin(): MoveBeginResult {
		if (this.active) return 'ok';
		const doc = documentRegistry.active;
		const sel = doc?.selection;
		const layer = doc?.activeLayer;
		if (!doc || !sel || !layer || !sel.active || !sel.maskId) return 'none';
		const surfaces = this.renderer.surfaces;
		if (!surfaces.has(sel.maskId) || !surfaces.has(layer.surfaceId)) return 'none';

		const w = doc.width;
		const h = doc.height;
		const bounds = sel.bounds ?? { x: 0, y: 0, width: w, height: h };

		// 1) floating content = layer pixels × selection mask, cropped to bounds
		const full = surfaces.create(w, h);
		blitMaskedInto(surfaces, sel.maskId, layer.surfaceId, full, 'normal', w, h);
		const floatingId = surfaces.copyRegion(full, bounds);
		surfaces.dispose(full);

		// 2) erased layer = "keep" content (everything NOT selected) — the same
		//    exact-transparency path Delete uses (no premultiplied residue)
		const keepId = complementMaskSurface(surfaces, sel.maskId, w, h);
		const erasedId = surfaces.create(w, h);
		blitMaskedInto(surfaces, keepId, layer.surfaceId, erasedId, 'normal', w, h);
		surfaces.dispose(keepId);

		this.doc = doc;
		this.layer = layer;
		this.beforeId = layer.surfaceId;
		this.erasedId = erasedId;
		this.floatingId = floatingId;
		this.bounds = bounds;
		this.offset = { x: 0, y: 0 };
		this.pivot = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
		this.scaleX = 1;
		this.scaleY = 1;
		this.rotation = 0;
		this.skewX = 0;
		this.skewY = 0;
		this.warpQuad = null;
		this.rot3 = IDENTITY3;
		this.ringGesture = null;
		this.moveGesture = null;
		this.transformGesture = null;
		this.origin = null;
		this.active = true;
		logTransformDebug('engine.begin', { bounds, selectionBounds: sel.bounds ?? null });

		layer.surfaceId = erasedId;
		this.renderer.rebuildActiveLayers();
		this.renderer.setActiveFloating(surfaces.getTexture(floatingId), bounds.x, bounds.y);
		this.renderer.refreshActiveSelection();
		// A projective sub-mode (rotate / distort) takes over immediately.
		if (this.mode === 'rotate' || this.mode === 'distort') {
			this.warpQuad = quadFromBounds(bounds);
			this.bakeAffineIntoQuad();
		}
		this.refreshVisuals();
		return 'ok';
	}

	/** Starts a drag gesture at image point `p` (offsets are relative to it). */
	beginDrag(p: Point): void {
		if (!this.active) return;
		this.origin = { x: Math.round(p.x), y: Math.round(p.y) };
		// move logic → ./move/moveLogic
		this.moveGesture = beginMove(p, this.offset);
	}

	/** Moves the floating preview by the drag offset (integer image px) and
	 * shifts the ants + tint veil along. Cheap: sprite positions + outline. */
	moveTo(p: Point): void {
		if (!this.active || !this.doc || !this.bounds || !this.moveGesture) return;
		const next = translateTo(this.moveGesture, p);
		if (sameOffset(next, this.offset)) {
			this.refreshVisuals();
			return;
		}
		this.offset = next;
		const surfaces = this.renderer.surfaces;
		if (!this.floatingId || !surfaces.has(this.floatingId)) return;
		this.renderer.setActiveFloating(surfaces.getTexture(this.floatingId), this.bounds.x + next.x, this.bounds.y + next.y);
		this.refreshVisuals();
	}

	/** Repaints everything the current state implies: the floating content
	 * (affine sprite OR warped mesh), the ants + tint and the live layer
	 * preview with the hole where the selection used to be. */
	private refreshVisuals(): void {
		this.applyFloatingTransform();
		const quad = this.currentQuad();
		if (quad && this.bounds) {
			this.renderer.setActiveFloatingQuad(quadPoints(quad));
			this.renderer.previewWarpedSelectionOutline(homographyForQuad(this.bounds, quad));
		} else {
			this.renderer.setActiveFloatingQuad(null);
			this.applyPreviewTransform();
		}
		this.updateLivePreview();
	}

	/**
	 * Warps the SELECTION MASK through the current projective map into
	 * `destId`. Returns false when no projective session is active, so the
	 * caller can fall back to the affine blit.
	 *
	 * The mask is cropped to the selection bounds BEFORE being warped. Warping
	 * the whole doc-sized mask (what this used to do) pushes the document
	 * corners — far outside the source quad — through the homography; they
	 * cross the vanishing line after only a few pixels of drag and the mesh
	 * explodes over the entire canvas. Cropping keeps the source and the
	 * corner-pin quad identical, which is always finite for a convex quad.
	 */
	private warpMask(destId: SurfaceId, blend: 'normal' | 'erase'): boolean {
		const surfaces = this.renderer.surfaces;
		const maskId = this.doc?.selection.maskId;
		const bounds = this.bounds;
		const quad = this.currentQuad();
		if (!maskId || !bounds || !quad || !surfaces.has(maskId)) return false;
		if (bounds.width < 1 || bounds.height < 1) return false;
		const crop = surfaces.copyRegion(maskId, bounds);
		surfaces.blitPerspective(crop, destId, quadPoints(quad), blend);
		surfaces.dispose(crop);
		return true;
	}

	/** Corners of the bounds-sized floating texture pushed through `h`. */
	private warpedBoundsCorners(h: { h: ArrayLike<number> } | null): [Point, Point, Point, Point] | null {
		const b = this.bounds;
		if (!h || !b) return null;
		const m = h.h;
		const map = (x: number, y: number): Point => {
			const wd = m[6] * x + m[7] * y + m[8] || 1;
			return { x: (m[0] * x + m[1] * y + m[2]) / wd, y: (m[3] * x + m[4] * y + m[5]) / wd };
		};
		return [map(b.x, b.y), map(b.x + b.width, b.y), map(b.x + b.width, b.y + b.height), map(b.x, b.y + b.height)];
	}

	private updateLivePreview(): void {
		if (!this.active || !this.erasedId || !this.floatingId || !this.bounds) return;
		const surfaces = this.renderer.surfaces;
		const w = this.doc?.width ?? 0;
		const h = this.doc?.height ?? 0;
		const previewId = surfaces.copyRegion(this.erasedId, { x: 0, y: 0, width: w, height: h });
		const maskId = this.doc?.selection.maskId;
		if (maskId && surfaces.has(maskId)) {
			const movedMaskId = surfaces.create(w, h);
			if (!this.warped || !this.warpMask(movedMaskId, 'normal'))
				surfaces.blitTransformed(maskId, movedMaskId, this.pivot.x, this.pivot.y, this.pivot.x, this.pivot.y, this.offset.x, this.offset.y, this.scaleX, this.scaleY, this.rotation, 'normal', this.skewX, this.skewY);
			eraseSelectionRegion(surfaces, movedMaskId, previewId, w, h);
			surfaces.dispose(movedMaskId);
		}
		this.renderer.setActiveLayerPreview(surfaces.getTexture(previewId));
		if (this.previewId && surfaces.has(this.previewId)) surfaces.dispose(this.previewId);
		this.previewId = previewId;
	}

	/** Nudges the floating selection by whole image pixels (arrow keys). Lifts
	 * the selection first when no session is active, so a first nudge starts
	 * the move (Paint.NET behaviour). The session stays floating until an
	 * explicit drop/cancel — exactly like a mouse drag. */
	nudge(dx: number, dy: number): void {
		if (!this.active) {
			if (this.begin() !== 'ok') return;
		}
		if (!this.active || !this.doc || !this.bounds) return;
		const next = nudgeOffset(this.offset, dx, dy); // move logic → ./move/moveLogic
		if (sameOffset(next, this.offset)) return;
		this.offset = next;
		const surfaces = this.renderer.surfaces;
		if (!this.floatingId || !surfaces.has(this.floatingId)) return;
		this.renderer.setActiveFloating(surfaces.getTexture(this.floatingId), this.bounds.x + next.x, this.bounds.y + next.y);
		this.refreshVisuals();
	}

	private applyPreviewTransform(): void {
		this.renderer.previewTransformedSelectionOutline(this.pivot, this.offset, this.scaleX, this.scaleY, this.rotation, this.skewX, this.skewY);
		this.renderer.setActiveTintTransform(
			this.pivot.x,
			this.pivot.y,
			this.offset.x,
			this.offset.y,
			this.scaleX,
			this.scaleY,
			this.rotation,
			this.skewX,
			this.skewY
		);
	}

	/** Handle frame for the overlay: the armed gesture's frozen extremes, else
	 * a refit from the committed selection geometry. Selection-space points —
	 * the canvas maps them through the live affine state, so draggers sit on
	 * the visible shape (rotated outlines included) instead of a detached
	 * bounding box. Null when there is nothing to fit (overlay falls back to
	 * the bounds rect). */
	get dragFrame(): FramePoints | null {
		if (this.transformGesture?.frame) return this.transformGesture.frame;
		const doc = this.doc ?? documentRegistry.active;
		const loops = doc ? this.renderer.committedShapeLoops(doc) : null;
		return loops?.length ? framePointsFromLoops(loops) : null;
	}

	/** Starts a resize, pivot move, or rotation gesture. Only the gesture is
	 * captured here — the maths lives in ./move (rotateLogic / distortLogic). */
	beginTransform(handle: TransformHandle, p: Point): void {
		if (!this.active || !this.bounds) return;
		this.origin = { ...p };
		// Arm the translate gesture too: a 'move' handle may be dragged through
		// either moveTo() (startMoveDrag) or transformTo().
		this.moveGesture = beginMove(p, this.offset);
		const axis = ringAxis(handle);
		if (axis) {
			// rotate sub-mode: flat rotation handle drag.
			this.beginRing(axis, p);
			this.transformGesture = beginGesture(handle, p, this.currentState());
			return;
		}
		this.transformGesture = beginGesture(handle, p, this.currentState());
		// Freeze the dragger frame the gesture grabbed (selection-space
		// extremes of the committed outline). The overlay draws these same
		// points and the scale maths anchors to them, so pointer, handles and
		// math agree for the whole drag — for plain rects this is exactly the
		// classic bounds frame.
		const doc = this.doc ?? documentRegistry.active;
		const loops = doc ? this.renderer.committedShapeLoops(doc) : null;
		if (this.transformGesture && loops?.length) {
			this.transformGesture.frame = framePointsFromLoops(loops);
		}
		logTransformDebug('engine.beginTransform', {
			handle,
			pointer: p,
			mode: this.mode,
			transformStart: this.transformGesture.start,
			bounds: this.bounds
		});
	}

	/** The session transform in the shape the mode modules consume. */
	private currentState(): TransformState {
		return {
			pivot: { ...this.pivot },
			offset: { ...this.offset },
			scaleX: this.scaleX,
			scaleY: this.scaleY,
			rotation: this.rotation,
			skewX: this.skewX,
			skewY: this.skewY
		};
	}

	/** Writes a mode module's result back into the session and repaints the
	 * floating sprite, the ants and the live layer preview. */
	private applyState(next: TransformState): void {
		this.pivot = { ...next.pivot };
		this.offset = { ...next.offset };
		this.scaleX = next.scaleX;
		this.scaleY = next.scaleY;
		this.rotation = next.rotation;
		this.skewX = next.skewX;
		this.skewY = next.skewY;
		this.refreshVisuals();
	}

	setPivot(p: Point): void {
		if (!this.active || !this.bounds) return;
		this.applyState(pivotTo(this.currentState(), p)); // rotate logic
	}

	setTransformState(state: { pivot: Point; offset: Point; scaleX: number; scaleY: number; rotation: number; skewX?: number; skewY?: number }): void {
		if (!this.active) return;
		this.applyState({
			pivot: { ...state.pivot },
			offset: { ...state.offset },
			scaleX: state.scaleX,
			scaleY: state.scaleY,
			rotation: state.rotation,
			skewX: state.skewX ?? 0,
			skewY: state.skewY ?? 0
		});
	}

	/** Continues the gesture started by beginTransform(). The active sub-mode
	 * picks the module that turns pointer + gesture into the next transform. */
	transformTo(p: Point, shift = false, alt = false): void {
		const g = this.transformGesture;
		if (!this.active || !this.bounds || !g) return;
		const b = this.bounds;

		// Rotate sub-mode: a flat rotation-handle drag.
		if (ringAxis(g.handle) && this.ringGesture) {
			this.rotateRingTo(p, shift);
			return;
		}

		// Distort sub-mode: each corner is dragged independently and the
		// pixels are warped to match the resulting quad.
		if (this.mode === 'distort' && this.warpQuad) {
			const corner = cornerFromHandle(g.handle);
			if (corner) {
				this.distortCornerTo(corner, p);
				return;
			}
			// edge handles are not exposed by the distort overlay — any other
			// handle behaves like a translation.
			const next: TransformState = { ...g.start, offset: translateTo({ origin: g.origin, baseOffset: g.start.offset }, p) };
			this.applyState(next);
			return;
		}

		let next: TransformState;
		if (isTranslationHandle(g.handle)) {
			// move logic (./move/moveLogic) — translate; every sub-mode must
			// still be able to move the selection.
			next = { ...g.start, offset: translateTo({ origin: g.origin, baseOffset: g.start.offset }, p) };
		} else {
			next = rotateTo(g, p, b, { shift, alt }); // rotate logic (pivot / rotate / scale)
		}
		this.applyState(next);
		logTransformDebug('engine.transformTo', {
			handle: g.handle,
			mode: this.mode,
			pointer: p,
			shift,
			alt,
			transform: this.transformState
		});
	}

	private applyFloatingTransform(): void {
		if (!this.floatingId) return;
		this.renderer.setActiveFloatingTransform(
			this.pivot.x,
			this.pivot.y,
			this.offset.x,
			this.offset.y,
			this.scaleX,
			this.scaleY,
			this.rotation,
			this.skewX,
			this.skewY
		);
	}

	/**
	 * Drops the floating selection: builds the after-layer (erased + floating
	 * content at the new position), moves the selection mask/geometry by the
	 * same offset and records everything as one history entry. A zero-offset
	 * session restores the original state instead (nothing moved).
	 * Returns false when nothing was committed.
	 */
	drop(): boolean {
		logTransformDebug('engine.drop.begin', { transform: this.transformState });
		if (!this.active || !this.doc || !this.layer || !this.bounds) {
			this.cancel();
			return false;
		}
		const doc = this.doc;
		const layer = this.layer;
		const surfaces = this.renderer.surfaces;
		// surfaces vanished (document closed mid-session) → bail out silently
		if (
			!this.beforeId ||
			!this.erasedId ||
			!this.floatingId ||
			!surfaces.has(this.beforeId) ||
			!surfaces.has(this.erasedId) ||
			!surfaces.has(this.floatingId) ||
			!doc.selection.active
		) {
			this.reset();
			return false;
		}
		const dx = this.offset.x;
		const dy = this.offset.y;
		const warp = this.warpHomography;
		const quad = this.currentQuad();
		const warped = !!warp && !!quad;
		if (!warped && dx === 0 && dy === 0 && this.scaleX === 1 && this.scaleY === 1 && this.rotation === 0 && this.skewX === 0 && this.skewY === 0) {
			this.cancel();
			return false;
		}

		const w = doc.width;
		const h = doc.height;
		const beforeId = this.beforeId;
		const erasedId = this.erasedId;
		const floatingId = this.floatingId;
		const bounds = this.bounds;

		// after = erased layer + floating content at the new position
		const afterId = surfaces.copyRegion(erasedId, { x: 0, y: 0, width: w, height: h });

		// Clear the transformed destination from the mask itself. Transparent
		// source pixels must still create a hole on this layer.
		const sel = doc.selection;
		const oldMaskId = sel.maskId;
		// projective path (rotate / distort): the mask travels through the
		// homography instead of the affine sprite transform (see `warpMask`).
		const floatingCorners = this.warpedBoundsCorners(warp);
		if (!(warped && this.warpMask(afterId, 'erase')) && oldMaskId && surfaces.has(oldMaskId))
			surfaces.blitTransformed(oldMaskId, afterId, this.pivot.x, this.pivot.y, this.pivot.x, this.pivot.y, dx, dy, this.scaleX, this.scaleY, this.rotation, 'erase', this.skewX, this.skewY);

		// move the selection (mask surface + geometry) by the same offset
		const newMaskId = surfaces.create(w, h);
		if (!(warped && this.warpMask(newMaskId, 'normal')) && oldMaskId && surfaces.has(oldMaskId))
			surfaces.blitTransformed(oldMaskId, newMaskId, this.pivot.x, this.pivot.y, this.pivot.x, this.pivot.y, dx, dy, this.scaleX, this.scaleY, this.rotation, 'normal', this.skewX, this.skewY);
		// A floating selection is a cut/paste operation, not just a normal
		// alpha blend: transparent selected pixels must clear the destination.
		eraseSelectionRegion(surfaces, newMaskId, afterId, w, h);
		if (warped && floatingCorners) surfaces.blitPerspective(floatingId, afterId, floatingCorners, 'normal');
		else
			surfaces.blitTransformed(
				floatingId,
				afterId,
				this.pivot.x - bounds.x,
				this.pivot.y - bounds.y,
				this.pivot.x,
				this.pivot.y,
				dx,
				dy,
				this.scaleX,
				this.scaleY,
				this.rotation,
				'normal',
				this.skewX,
				this.skewY
			);

		const origRect = sel.rect ? { ...sel.rect } : null;
		const origPoints = sel.points?.map((pt) => ({ ...pt })) ?? null;
		const origBounds = sel.bounds ? { ...sel.bounds } : null;
		const origComposite = sel.composite;
		const origInverted = sel.inverted;
		const origOutlineLoops = sel.outlineLoops?.map((loop) => loop.map((pt) => ({ ...pt }))) ?? null;
		const origTextPos = layer.text ? { x: layer.text.x, y: layer.text.y } : null;
		const movedRect = origRect ? { x: origRect.x + dx, y: origRect.y + dy, width: origRect.width, height: origRect.height } : null;
		const movedPoints = origPoints?.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) ?? null;
		const movedBounds = origBounds ? { x: origBounds.x + dx, y: origBounds.y + dy, width: origBounds.width, height: origBounds.height } : null;

		sel.maskId = newMaskId;
		sel.rect = movedRect;
		sel.points = movedPoints;
		sel.bounds = movedBounds;
		if (warped || this.scaleX !== 1 || this.scaleY !== 1 || this.rotation !== 0 || this.skewX !== 0 || this.skewY !== 0) {
			sel.composite = true;
			sel.inverted = false;
			sel.outlineLoops = this.renderer.computeMaskOutline(newMaskId, w, h);
			sel.bounds = boundsOfLoops(sel.outlineLoops) ?? movedBounds;
		} else if (sel.composite) {
			// combined selections have no single geometry — the ants and bounds
			// must be re-derived from the moved mask surface
			sel.outlineLoops = this.renderer.computeMaskOutline(newMaskId, w, h);
			sel.bounds = boundsOfLoops(sel.outlineLoops) ?? movedBounds;
		} else {
			sel.outlineLoops = null;
		}
		const afterRect = sel.rect ? { ...sel.rect } : null;
		const afterPoints = sel.points?.map((pt) => ({ ...pt })) ?? null;
		const afterBounds = sel.bounds ? { ...sel.bounds } : null;
		const afterComposite = sel.composite;
		const afterInverted = sel.inverted;
		const afterOutlineLoops = sel.outlineLoops?.map((loop) => loop.map((pt) => ({ ...pt }))) ?? null;

		layer.surfaceId = afterId;
		// A moved text layer keeps its editable anchor glued to its pixels.
		if (layer.text) {
			layer.text.x += dx;
			layer.text.y += dy;
		}
		const afterTextPos = layer.text ? { x: layer.text.x, y: layer.text.y } : null;
		this.renderer.rebuildActiveLayers();
		this.renderer.setActiveFloating(null);
		if (this.previewId && surfaces.has(this.previewId)) surfaces.dispose(this.previewId);
		surfaces.dispose(erasedId);
		surfaces.dispose(floatingId);
		const layerId = layer.id;
		logTransformDebug('engine.drop.complete', {
			offset: { ...this.offset },
			scaleX: this.scaleX,
			scaleY: this.scaleY,
			rotation: this.rotation,
			selectionBounds: sel.bounds
		});
		this.reset();

		const label = warped ? (this.mode === 'rotate' ? 'Rotate Selection' : 'Distort Selection') : 'Move Selection';
		doc.setDirty(true);
		doc.history.push({
			label,
			memoryBytes: w * h * 4 * 4, // before/after layer + old/new mask
			undo: () => {
				if (layer.surfaceId === afterId) {
					layer.surfaceId = beforeId;
					this.renderer.rebuildActiveLayers();
				}
				if (origTextPos && layer.text) {
					layer.text.x = origTextPos.x;
					layer.text.y = origTextPos.y;
				}
				if (sel.maskId === newMaskId) {
					sel.maskId = oldMaskId;
					sel.rect = origRect;
					sel.points = origPoints;
					sel.bounds = origBounds;
					sel.composite = origComposite;
					sel.inverted = origInverted;
					sel.outlineLoops = origOutlineLoops;
					this.renderer.refreshActiveSelection();
				}
			},
			redo: () => {
				if (layer.surfaceId === beforeId) {
					layer.surfaceId = afterId;
					this.renderer.rebuildActiveLayers();
				}
				if (afterTextPos && layer.text) {
					layer.text.x = afterTextPos.x;
					layer.text.y = afterTextPos.y;
				}
				if (sel.maskId === oldMaskId) {
					sel.maskId = newMaskId;
					sel.rect = afterRect;
					sel.points = afterPoints;
					sel.bounds = afterBounds;
					sel.composite = afterComposite;
					sel.inverted = afterInverted;
					sel.outlineLoops = afterOutlineLoops;
					this.renderer.refreshActiveSelection();
				}
			},
			dispose: () => {
				// free whichever snapshot is NOT the live surface (same policy as Delete)
				if (layer.surfaceId === afterId) {
					surfaces.dispose(beforeId);
					if (sel.maskId === newMaskId && oldMaskId) surfaces.dispose(oldMaskId);
				} else {
					surfaces.dispose(afterId);
					if (sel.maskId === oldMaskId) surfaces.dispose(newMaskId);
				}
			}
		});
		documentRegistry.notifyChange(doc);
		this.renderer.refreshActiveSelection();
		return true;
	}

	/** Aborts the session: restores the untouched layer and drops the previews. */
	cancel(): void {
		logTransformDebug('engine.cancel', { active: this.active, transform: this.transformState });
		if (!this.active) {
			this.reset();
			return;
		}
		const surfaces = this.renderer.surfaces;
		if (
			this.doc &&
			this.layer &&
			this.beforeId &&
			surfaces.has(this.beforeId) &&
			this.layer.surfaceId === this.erasedId
		) {
			this.layer.surfaceId = this.beforeId;
			this.renderer.rebuildActiveLayers();
		}
		if (this.erasedId && surfaces.has(this.erasedId)) surfaces.dispose(this.erasedId);
		if (this.floatingId && surfaces.has(this.floatingId)) surfaces.dispose(this.floatingId);
		this.renderer.setActiveFloating(null);
		if (this.previewId && surfaces.has(this.previewId)) surfaces.dispose(this.previewId);
		if (this.beforeId && surfaces.has(this.beforeId))
			this.renderer.setActiveLayerPreview(null, surfaces.getTexture(this.beforeId));
		this.reset();
		this.renderer.refreshActiveSelection();
	}

	private reset(): void {
		logTransformDebug('engine.reset');
		this.doc = null;
		this.layer = null;
		this.beforeId = null;
		this.erasedId = null;
		this.floatingId = null;
		this.bounds = null;
		this.origin = null;
		this.moveGesture = null;
		this.transformGesture = null;
		this.warpQuad = null;
		this.rot3 = IDENTITY3;
		this.ringGesture = null;
		this.offset = { x: 0, y: 0 };
		this.pivot = { x: 0, y: 0 };
		this.scaleX = 1;
		this.scaleY = 1;
		this.rotation = 0;
		this.skewX = 0;
		this.skewY = 0;
		this.active = false;
	}
}
