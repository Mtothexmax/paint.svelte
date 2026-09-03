// Layer: render (pixi). Move-tool engine, Paint.NET style: the first drag
// INSIDE the selection lifts the selected pixels into a floating preview
// (through the mask) and erases them from the layer; the floating content can
// then be re-dragged any number of times. NOTHING is written to the document
// until the selection is DROPPED — click outside the selection, Enter, or a
// tool switch — which commits pixels + selection (mask + geometry) as ONE
// undoable step. Escape cancels and restores the original state. Works for
// any selection the mask can express: simple shapes, complements (donuts) and
// combined add/subtract regions.

import { Rectangle, Sprite } from 'pixi.js';
import type { Point, Rect } from '../core/geometry';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { Layer, SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { blitMaskedInto, boundsOfLoops, complementMaskSurface } from './selection';

export type MoveBeginResult = 'ok' | 'none';

export class MoveEngine {
	private renderer: EditorRenderer;

	// session state — valid while `active` (floating or being dragged)
	private doc: ImageDocument | null = null;
	private layer: Layer | null = null;
	private beforeId: SurfaceId | null = null;
	private erasedId: SurfaceId | null = null;
	private floatingId: SurfaceId | null = null;
	private bounds: Rect | null = null;
	private offset: Point = { x: 0, y: 0 };

	// drag-in-flight state
	private origin: Point | null = null; // press point of the current drag
	private baseOffset: Point = { x: 0, y: 0 }; // offset when the drag started
	private active = false;

	constructor(renderer: EditorRenderer) {
		this.renderer = renderer;
	}

	/** True while a lifted (floating) selection exists — dropped only via drop(). */
	get floating(): boolean {
		return this.active;
	}

	/** True when the current selection mask covers the given image point. A 1×1
	 * GPU read-back of the mask surface — mask-authoritative, so donut holes
	 * count as "outside". */
	pointInSelection(p: Point): boolean {
		const doc = documentRegistry.active;
		const sel = doc?.selection;
		if (!doc || !sel?.maskId || !this.renderer.surfaces.has(sel.maskId)) return false;
		const x = Math.floor(p.x);
		const y = Math.floor(p.y);
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
		this.baseOffset = { x: 0, y: 0 };
		this.origin = null;
		this.active = true;

		layer.surfaceId = erasedId;
		this.renderer.rebuildActiveLayers();
		this.renderer.setActiveFloating(surfaces.getTexture(floatingId), bounds.x, bounds.y);
		return 'ok';
	}

	/** Starts a drag gesture at image point `p` (offsets are relative to it). */
	beginDrag(p: Point): void {
		if (!this.active) return;
		this.origin = { x: Math.round(p.x), y: Math.round(p.y) };
		this.baseOffset = { x: this.offset.x, y: this.offset.y };
	}

	/** Moves the floating preview by the drag offset (integer image px) and
	 * shifts the ants + tint veil along. Cheap: sprite positions + outline. */
	moveTo(p: Point): void {
		if (!this.active || !this.doc || !this.bounds || !this.origin) return;
		const dx = this.baseOffset.x + Math.round(p.x - this.origin.x);
		const dy = this.baseOffset.y + Math.round(p.y - this.origin.y);
		if (dx === this.offset.x && dy === this.offset.y) return;
		this.offset = { x: dx, y: dy };
		const surfaces = this.renderer.surfaces;
		if (!this.floatingId || !surfaces.has(this.floatingId)) return;
		this.renderer.setActiveFloating(surfaces.getTexture(this.floatingId), this.bounds.x + dx, this.bounds.y + dy);
		this.renderer.previewMovedSelectionOutline(dx, dy);
		this.renderer.setActiveTintOffset(dx, dy);
	}

	/**
	 * Drops the floating selection: builds the after-layer (erased + floating
	 * content at the new position), moves the selection mask/geometry by the
	 * same offset and records everything as one history entry. A zero-offset
	 * session restores the original state instead (nothing moved).
	 * Returns false when nothing was committed.
	 */
	drop(): boolean {
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
		if (dx === 0 && dy === 0) {
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
		surfaces.blitRegion(floatingId, afterId, bounds.x + dx, bounds.y + dy, 'normal', 1);

		// move the selection (mask surface + geometry) by the same offset
		const sel = doc.selection;
		const oldMaskId = sel.maskId;
		const newMaskId = surfaces.create(w, h);
		if (oldMaskId && surfaces.has(oldMaskId)) surfaces.blitRegion(oldMaskId, newMaskId, dx, dy, 'normal', 1);

		const origRect = sel.rect ? { ...sel.rect } : null;
		const origPoints = sel.points?.map((pt) => ({ ...pt })) ?? null;
		const origBounds = sel.bounds ? { ...sel.bounds } : null;
		const movedRect = origRect ? { x: origRect.x + dx, y: origRect.y + dy, width: origRect.width, height: origRect.height } : null;
		const movedPoints = origPoints?.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) ?? null;
		const movedBounds = origBounds ? { x: origBounds.x + dx, y: origBounds.y + dy, width: origBounds.width, height: origBounds.height } : null;

		sel.maskId = newMaskId;
		sel.rect = movedRect;
		sel.points = movedPoints;
		sel.bounds = movedBounds;
		if (sel.composite) {
			// combined selections have no single geometry — the ants and bounds
			// must be re-derived from the moved mask surface
			sel.outlineLoops = this.renderer.computeMaskOutline(newMaskId, w, h);
			sel.bounds = boundsOfLoops(sel.outlineLoops) ?? movedBounds;
		} else {
			sel.outlineLoops = null;
		}

		layer.surfaceId = afterId;
		this.renderer.rebuildActiveLayers();
		this.renderer.setActiveFloating(null);
		surfaces.dispose(erasedId);
		surfaces.dispose(floatingId);
		const layerId = layer.id;
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
				if (sel.maskId === newMaskId) {
					sel.maskId = oldMaskId;
					sel.rect = origRect;
					sel.points = origPoints;
					sel.bounds = origBounds;
					this.renderer.refreshActiveSelection();
				}
			},
			redo: () => {
				if (layer.surfaceId === beforeId) {
					layer.surfaceId = afterId;
					this.renderer.rebuildActiveLayers();
				}
				if (sel.maskId === oldMaskId) {
					sel.maskId = newMaskId;
					sel.rect = movedRect;
					sel.points = movedPoints;
					sel.bounds = movedBounds;
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
		this.reset();
		this.renderer.refreshActiveSelection();
	}

	private reset(): void {
		this.doc = null;
		this.layer = null;
		this.beforeId = null;
		this.erasedId = null;
		this.floatingId = null;
		this.bounds = null;
		this.origin = null;
		this.baseOffset = { x: 0, y: 0 };
		this.offset = { x: 0, y: 0 };
		this.active = false;
	}
}
