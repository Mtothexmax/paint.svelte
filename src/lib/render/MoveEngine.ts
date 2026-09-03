// Layer: render (pixi). Move-tool engine. Lifts the selected pixels of the
// active layer into a floating preview (through the selection mask) and erases
// them from the layer while the user drags; on release the gesture is committed
// as ONE undoable step: layer pixels moved + selection (mask + geometry) moved
// by the same offset. Works for positive and complement (donut) selections;
// combined (add/subtract) selections are refused like Delete, for now.

import type { Point, Rect } from '../core/geometry';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { Layer, SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { blitMaskedInto, fillShapeMask, invertSelectionMask } from './selection';

export type MoveBeginResult = 'ok' | 'composite' | 'none';

export class MoveEngine {
	private renderer: EditorRenderer;

	// gesture state (all null while idle)
	private doc: ImageDocument | null = null;
	private layer: Layer | null = null;
	private beforeId: SurfaceId | null = null;
	private erasedId: SurfaceId | null = null;
	private floatingId: SurfaceId | null = null;
	private bounds: Rect | null = null;
	private origin: Point | null = null; // pointer start, image px
	private offset: Point = { x: 0, y: 0 };
	private active = false;

	constructor(renderer: EditorRenderer) {
		this.renderer = renderer;
	}

	get moving(): boolean {
		return this.active;
	}

	/**
	 * Lifts the selection content of the active layer: the floating pixels are
	 * shown at the selection bounds, the layer itself shows the erased "hole".
	 * Returns why nothing was lifted: 'composite' (combined selection) or
	 * 'none' (no doc / no selection / no mask).
	 */
	begin(start: Point): MoveBeginResult {
		if (this.active) this.cancel();
		const doc = documentRegistry.active;
		const sel = doc?.selection;
		const layer = doc?.activeLayer;
		if (!doc || !sel || !layer || !sel.active || !sel.maskId) return 'none';
		if (sel.composite) return 'composite';
		const surfaces = this.renderer.surfaces;
		if (!surfaces.has(sel.maskId)) return 'none';

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
		const keepId = surfaces.create(w, h);
		if (sel.inverted) fillShapeMask(surfaces, keepId, w, h, sel.kind, sel.rect, sel.points);
		else invertSelectionMask(surfaces, keepId, w, h, sel.kind, sel.rect, sel.points);
		const erasedId = surfaces.create(w, h);
		blitMaskedInto(surfaces, keepId, layer.surfaceId, erasedId, 'normal', w, h);
		surfaces.dispose(keepId);

		this.doc = doc;
		this.layer = layer;
		this.beforeId = layer.surfaceId;
		this.erasedId = erasedId;
		this.floatingId = floatingId;
		this.bounds = bounds;
		this.origin = { x: Math.round(start.x), y: Math.round(start.y) };
		this.offset = { x: 0, y: 0 };
		this.active = true;

		layer.surfaceId = erasedId;
		this.renderer.rebuildActiveLayers();
		this.renderer.setActiveFloating(surfaces.getTexture(floatingId), bounds.x, bounds.y);
		return 'ok';
	}

	/** Moves the floating preview by the (integer) drag offset and shifts the
	 * ants preview along. Cheap: only sprite positions + an outline redraw. */
	moveTo(p: Point): void {
		if (!this.active || !this.doc || !this.bounds || !this.origin) return;
		const dx = Math.round(p.x - this.origin.x);
		const dy = Math.round(p.y - this.origin.y);
		if (dx === this.offset.x && dy === this.offset.y) return;
		this.offset = { x: dx, y: dy };
		const surfaces = this.renderer.surfaces;
		if (!this.floatingId || !surfaces.has(this.floatingId)) return;
		this.renderer.setActiveFloating(surfaces.getTexture(this.floatingId), this.bounds.x + dx, this.bounds.y + dy);
		this.renderer.previewMovedSelectionOutline(dx, dy);
	}

	/**
	 * Commits the gesture: builds the after-layer (erased + floating content at
	 * the new position), moves the selection mask/geometry by the same offset
	 * and records everything as one history entry. A zero-offset gesture is
	 * cancelled instead. Returns false when nothing was committed.
	 */
	commit(): boolean {
		if (!this.active || !this.doc || !this.layer || !this.bounds) {
			this.cancel();
			return false;
		}
		const doc = this.doc;
		const layer = this.layer;
		const surfaces = this.renderer.surfaces;
		// surfaces vanished (document closed mid-drag) → bail out silently
		if (
			!this.beforeId ||
			!this.erasedId ||
			!this.floatingId ||
			!surfaces.has(this.beforeId) ||
			!surfaces.has(this.erasedId) ||
			!surfaces.has(this.floatingId)
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
		sel.outlineLoops = null;

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

	/** Aborts the gesture: restores the untouched layer and drops the previews. */
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
		this.offset = { x: 0, y: 0 };
		this.active = false;
	}
}
