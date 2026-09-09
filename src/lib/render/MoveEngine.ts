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
//   • move/distortLogic.ts — 4-corner warp (placeholder, see the file header)

import { Rectangle, Sprite } from 'pixi.js';
import type { Point, Rect } from '../core/geometry';
import type { MoveToolMode } from '../core/toolMode';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { Layer, SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { blitMaskedInto, boundsOfLoops, complementMaskSurface, eraseSelectionRegion } from './selection';
import { logTransformDebug } from './transformDebug';
// Sub-mode modules (todo3): pure gesture maths, one file per mode.
import { beginMove, moveTo as translateTo, nudge as nudgeOffset, sameOffset, type MoveGesture } from './move/moveLogic';
import { pivotTo, rotateTo } from './move/rotateLogic';
import { distortTo } from './move/distortLogic';
import { beginGesture, isScaleHandle, isTranslationHandle, type TransformGesture, type TransformHandle, type TransformState } from './move/types';

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
	 * module in ./move handles the corner/edge grips. */
	setMode(v: MoveToolMode): void {
		this.mode = v;
	}

	get moveMode(): MoveToolMode {
		return this.mode;
	}

	/** True when the current selection mask covers the given image point. A 1×1
	 * GPU read-back of the mask surface — mask-authoritative, so donut holes
	 * count as "outside". */
	pointInSelection(p: Point): boolean {
		const doc = documentRegistry.active;
		const sel = doc?.selection;
		if (!doc || !sel?.maskId || !this.renderer.surfaces.has(sel.maskId)) return false;
		const pt = this.active ? { x: p.x - this.offset.x, y: p.y - this.offset.y } : p;
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
		this.moveGesture = null;
		this.transformGesture = null;
		this.origin = null;
		this.active = true;
		logTransformDebug('engine.begin', { bounds, selectionBounds: sel.bounds ?? null });

		layer.surfaceId = erasedId;
		this.renderer.rebuildActiveLayers();
		this.renderer.setActiveFloating(surfaces.getTexture(floatingId), bounds.x, bounds.y);
		this.applyFloatingTransform();
		this.renderer.refreshActiveSelection();
		this.applyPreviewTransform();
		this.updateLivePreview();
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
			this.updateLivePreview();
			this.applyPreviewTransform();
			return;
		}
		this.offset = next;
		const surfaces = this.renderer.surfaces;
		if (!this.floatingId || !surfaces.has(this.floatingId)) return;
		this.renderer.setActiveFloating(surfaces.getTexture(this.floatingId), this.bounds.x + next.x, this.bounds.y + next.y);
		this.applyFloatingTransform();
		this.updateLivePreview();
		this.applyPreviewTransform();
	}

	private updateLivePreview(): void {
		if (!this.active || !this.erasedId || !this.floatingId || !this.bounds) return;
		const surfaces = this.renderer.surfaces;
		const previewId = surfaces.copyRegion(this.erasedId, { x: 0, y: 0, width: this.doc?.width ?? 0, height: this.doc?.height ?? 0 });
		const maskId = this.doc?.selection.maskId;
		if (maskId && surfaces.has(maskId)) {
			const movedMaskId = surfaces.create(this.doc!.width, this.doc!.height);
			surfaces.blitTransformed(maskId, movedMaskId, this.pivot.x, this.pivot.y, this.pivot.x, this.pivot.y, this.offset.x, this.offset.y, this.scaleX, this.scaleY, this.rotation, 'normal', this.skewX, this.skewY);
			eraseSelectionRegion(surfaces, movedMaskId, previewId, this.doc!.width, this.doc!.height);
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
		this.applyFloatingTransform();
		this.updateLivePreview();
		this.applyPreviewTransform();
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

	/** Starts a resize, pivot move, or rotation gesture. Only the gesture is
	 * captured here — the maths lives in ./move (rotateLogic / distortLogic). */
	beginTransform(handle: TransformHandle, p: Point): void {
		if (!this.active || !this.bounds) return;
		this.origin = { ...p };
		// Arm the translate gesture too: a 'move' handle may be dragged through
		// either moveTo() (startMoveDrag) or transformTo().
		this.moveGesture = beginMove(p, this.offset);
		this.transformGesture = beginGesture(handle, p, this.currentState());
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
		this.applyFloatingTransform();
		this.renderer.previewTransformedSelectionOutline(this.pivot, this.offset, this.scaleX, this.scaleY, this.rotation, this.skewX, this.skewY);
		this.renderer.setActiveTintTransform(this.pivot.x, this.pivot.y, this.offset.x, this.offset.y, this.scaleX, this.scaleY, this.rotation, this.skewX, this.skewY);
		this.updateLivePreview();
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
		let next: TransformState;
		if (isTranslationHandle(g.handle)) {
			// move logic (./move/moveLogic) — translate; the rotate and distort
			// modes must still be able to move the selection.
			next = { ...g.start, offset: translateTo({ origin: g.origin, baseOffset: g.start.offset }, p) };
		} else if (this.mode === 'distort' && isScaleHandle(g.handle)) {
			next = distortTo(g, p, b); // distort logic (placeholder → 4-corner warp)
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
		if (dx === 0 && dy === 0 && this.scaleX === 1 && this.scaleY === 1 && this.rotation === 0 && this.skewX === 0 && this.skewY === 0) {
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
		if (oldMaskId && surfaces.has(oldMaskId))
			surfaces.blitTransformed(oldMaskId, afterId, this.pivot.x, this.pivot.y, this.pivot.x, this.pivot.y, dx, dy, this.scaleX, this.scaleY, this.rotation, 'erase', this.skewX, this.skewY);

		// move the selection (mask surface + geometry) by the same offset
		const newMaskId = surfaces.create(w, h);
		if (oldMaskId && surfaces.has(oldMaskId))
			surfaces.blitTransformed(oldMaskId, newMaskId, this.pivot.x, this.pivot.y, this.pivot.x, this.pivot.y, dx, dy, this.scaleX, this.scaleY, this.rotation, 'normal', this.skewX, this.skewY);
		// A floating selection is a cut/paste operation, not just a normal
		// alpha blend: transparent selected pixels must clear the destination.
		eraseSelectionRegion(surfaces, newMaskId, afterId, w, h);
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
		if (this.scaleX !== 1 || this.scaleY !== 1 || this.rotation !== 0 || this.skewX !== 0 || this.skewY !== 0) {
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

		doc.setDirty(true);
		doc.history.push({
			label: 'Move Selection',
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
