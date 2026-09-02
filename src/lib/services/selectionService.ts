// Layer: services. Selection operations on the active document. Everything
// goes through the per-document SelectionModel + its mask surface — there is no
// per-tool selection logic anywhere (plan §4.6 mandate). Raster operations
// (Delete) use the same surface-swap undo pattern as the paint/effect layers.

import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { Point, Rect } from '../core/geometry';
import type { SurfaceId } from '../core/layers/Layer';
import type { RGBA } from '../core/color';
import { getEditorRenderer, hasEditorRenderer } from '../render/EditorRenderer';
import {
	blitMaskedInto,
	fillSelectionRegion,
	fillShapeMask,
	invertSelectionMask,
	maskAll
} from '../render/selection';
import { clamp } from '../core/geometry';

function activeDoc(): ImageDocument | null {
	return documentRegistry.active;
}

/** Re-syncs the selection overlay/stroke clip and notifies the UI adapters. */
function touch(doc: ImageDocument): void {
	getEditorRenderer().refreshActiveSelection();
	documentRegistry.notifyChange(doc);
}

/** True when the active document has a live selection. */
export function hasSelection(): boolean {
	return !!documentRegistry.active?.selection.active;
}

/** Normalizes an arbitrary drag rect to x/y >= 0 with integer boundaries. */
function normalizedRect(a: Point, b: Point): Rect {
	const x = Math.min(a.x, b.x);
	const y = Math.min(a.y, b.y);
	const x1 = Math.max(a.x, b.x);
	const y1 = Math.max(a.y, b.y);
	// Snap to whole pixels so the mask edge is crisp and deterministic.
	return {
		x: Math.round(x),
		y: Math.round(y),
		width: Math.round(x1) - Math.round(x),
		height: Math.round(y1) - Math.round(y)
	};
}

/** Clamps every lasso point into the document (pixel-snapped). */
function clampedPoints(points: Point[], doc: ImageDocument): Point[] {
	return points.map((p) => ({
		x: clamp(Math.round(p.x), 0, doc.width),
		y: clamp(Math.round(p.y), 0, doc.height)
	}));
}

/**
 * Commits a rectangle/ellipse selection. `a`/`b` are arbitrary drag endpoints
 * in image px (any direction). Returns false when nothing meaningful was
 * selected (e.g. a zero-size drag or no document).
 */
export function setRectSelection(kind: 'rect' | 'ellipse', a: Point, b: Point): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	const rect = normalizedRect(a, b);
	if (rect.width < 1 || rect.height < 1) return false;

	const renderer = getEditorRenderer();
	const maskId = renderer.ensureSelectionMask(doc);
	const bounds = fillShapeMask(renderer.surfaces, maskId, doc.width, doc.height, kind, rect, null);
	if (!bounds) return false;

	const sel = doc.selection;
	sel.active = true;
	sel.kind = kind;
	sel.rect = rect;
	sel.points = null;
	sel.bounds = bounds;
	sel.inverted = false;
	touch(doc);
	return true;
}

/** Commits a freehand lasso selection from collected image-px points. */
export function setLassoSelection(points: Point[]): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer() || points.length < 2) return false;
	const snapped = clampedPoints(points, doc);

	const renderer = getEditorRenderer();
	const maskId = renderer.ensureSelectionMask(doc);
	const bounds = fillShapeMask(renderer.surfaces, maskId, doc.width, doc.height, 'lasso', null, snapped);
	if (!bounds) return false;

	const sel = doc.selection;
	sel.active = true;
	sel.kind = 'lasso';
	sel.rect = null;
	sel.points = snapped;
	sel.bounds = bounds;
	sel.inverted = false;
	touch(doc);
	return true;
}

/** Selects the whole document (Ctrl+A). */
export function selectAll(): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	const renderer = getEditorRenderer();
	const maskId = renderer.ensureSelectionMask(doc);
	maskAll(renderer.surfaces, maskId, doc.width, doc.height);
	const sel = doc.selection;
	sel.active = true;
	sel.kind = 'rect';
	sel.rect = { x: 0, y: 0, width: doc.width, height: doc.height };
	sel.points = null;
	sel.bounds = { ...sel.rect };
	sel.inverted = false;
	touch(doc);
	return true;
}

/** Drops the selection. The mask surface is KEPT (pooled) for reuse. */
export function deselect(): void {
	const doc = activeDoc();
	if (!doc) return;
	if (!doc.selection.active) return;
	doc.selection.active = false;
	touch(doc);
}

/**
 * Inverts the current selection (mask complement). The pooled mask surface is
 * rewritten in place; `rect`/`points` always describe the POSITIVE shape, and
 * `inverted` flips so the mask matches (positive vs complement). Inverting
 * again restores the original positive selection.
 */
export function invertSelection(): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	const sel = doc.selection;
	if (!sel.active || !sel.maskId) return false;

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;

	if (!sel.inverted) {
		// Positive -> complement (doc minus shape). A shape that covers the
		// whole document inverts to nothing.
		const coversAll =
			sel.kind === 'rect' &&
			!!sel.rect &&
			sel.rect.x <= 0 &&
			sel.rect.y <= 0 &&
			sel.rect.x + sel.rect.width >= doc.width &&
			sel.rect.y + sel.rect.height >= doc.height;
		if (coversAll) {
			deselect();
			return true;
		}
		invertSelectionMask(surfaces, sel.maskId, doc.width, doc.height, sel.kind, sel.rect, sel.points);
		sel.inverted = true;
		sel.bounds = { x: 0, y: 0, width: doc.width, height: doc.height };
	} else {
		// Complement -> restore the positive shape.
		fillShapeMask(surfaces, sel.maskId, doc.width, doc.height, sel.kind, sel.rect, sel.points);
		sel.inverted = false;
		sel.bounds = sel.rect && sel.rect.width > 0 ? { ...sel.rect } : null;
	}

	touch(doc);
	return true;
}

/**
 * Deletes (erases to transparency) the active layer's pixels inside the
 * selection — one undoable surface swap, like a brush stroke. Returns false
 * when there is nothing to delete.
 */
export function deleteSelection(): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	const sel = doc.selection;
	if (!sel.active || !sel.maskId) return false;
	const layer = doc.activeLayer;
	if (!layer) return false;

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;

	// Surface-swap undo: never mutate the live layer surface in place.
	const beforeId = layer.surfaceId;

	// Build a "keep" mask = the pixels that must SURVIVE the delete (everything
	// NOT in the current selection). Rebuilding the result onto a fresh
	// transparent surface from this mask guarantees the deleted region becomes
	// exactly #00000000 — no premultiplied RGB residue from an 'erase' pass.
	const keepId: SurfaceId = surfaces.create(doc.width, doc.height);
	if (sel.inverted) {
		// currently the complement is selected → keep the positive shape
		fillShapeMask(surfaces, keepId, doc.width, doc.height, sel.kind, sel.rect, sel.points);
	} else {
		// positive shape selected → keep the complement (doc minus shape)
		invertSelectionMask(surfaces, keepId, doc.width, doc.height, sel.kind, sel.rect, sel.points);
	}
	const afterId: SurfaceId = surfaces.create(doc.width, doc.height); // fully transparent
	blitMaskedInto(surfaces, keepId, beforeId, afterId, 'normal', doc.width, doc.height);
	surfaces.dispose(keepId);

	layer.surfaceId = afterId;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: 'Delete',
		memoryBytes: doc.width * doc.height * 4 * 2,
		undo: () => {
			if (layer.surfaceId === afterId) {
				layer.surfaceId = beforeId;
				renderer.rebuildActiveLayers();
			}
		},
		redo: () => {
			if (layer.surfaceId === beforeId) {
				layer.surfaceId = afterId;
				renderer.rebuildActiveLayers();
			}
		},
		dispose: () => {
			if (layer.surfaceId === afterId) surfaces.dispose(beforeId);
			else surfaces.dispose(afterId);
		}
	});
	return true;
}

/**
 * Fills with an OPAQUE version of `color`: inside the active selection when one
 * exists, otherwise over the whole active layer (Backspace). One undoable
 * surface swap, like Delete.
 */
export function fillSelection(color: RGBA): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	const layer = doc.activeLayer;
	if (!layer) return false;

	const colorInt =
		((Math.round(color.r) & 0xff) << 16) | ((Math.round(color.g) & 0xff) << 8) | (Math.round(color.b) & 0xff);

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	const sel = doc.selection;

	const beforeId = layer.surfaceId;
	const afterId: SurfaceId =
		sel.active && sel.maskId
			? surfaces.copyRegion(beforeId, { x: 0, y: 0, width: doc.width, height: doc.height })
			: surfaces.create(doc.width, doc.height, colorInt);

	if (sel.active && sel.maskId) {
		fillSelectionRegion(surfaces, sel.maskId, afterId, colorInt, doc.width, doc.height);
	}

	layer.surfaceId = afterId;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: 'Fill',
		memoryBytes: doc.width * doc.height * 4 * 2,
		undo: () => {
			if (layer.surfaceId === afterId) {
				layer.surfaceId = beforeId;
				renderer.rebuildActiveLayers();
			}
		},
		redo: () => {
			if (layer.surfaceId === beforeId) {
				layer.surfaceId = afterId;
				renderer.rebuildActiveLayers();
			}
		},
		dispose: () => {
			if (layer.surfaceId === afterId) surfaces.dispose(beforeId);
			else surfaces.dispose(afterId);
		}
	});
	return true;
}
