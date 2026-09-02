// Layer: services. Selection operations on the active document. Everything
// goes through the per-document SelectionModel + its mask surface — there is no
// per-tool selection logic anywhere (plan §4.6 mandate). Raster operations
// (Delete) use the same surface-swap undo pattern as the paint/effect layers.

import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { Point, Rect } from '../core/geometry';
import type { SurfaceId } from '../core/layers/Layer';
import { getEditorRenderer, hasEditorRenderer } from '../render/EditorRenderer';
import {
	eraseSelectionRegion,
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
 * Inverts the selection mask (complement). The mask remains the authority;
 * `rect`/`points` keep describing the ORIGINAL shape and `inverted` flips so
 * the ants outline (doc border ∪ shape border) still matches the mask.
 * Inverting a whole-document selection produces an empty selection, which is
 * reported as a deselect (nothing to show).
 */
export function invertSelection(): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	const sel = doc.selection;
	if (!sel.active || !sel.maskId) return false;

	// Exact whole-doc rectangle inverted → empty selection (Paint.NET clears it).
	if (!sel.inverted && sel.rect && sel.bounds) {
		const coversAll =
			sel.rect.x <= 0 &&
			sel.rect.y <= 0 &&
			sel.rect.x + sel.rect.width >= doc.width &&
			sel.rect.y + sel.rect.height >= doc.height;
		if (coversAll) {
			deselect();
			return true;
		}
	}

	const renderer = getEditorRenderer();
	const oldId = sel.maskId;
	const newId = invertSelectionMask(renderer.surfaces, oldId, doc.width, doc.height);
	sel.maskId = newId;
	sel.inverted = !sel.inverted;
	sel.bounds = { x: 0, y: 0, width: doc.width, height: doc.height };
	// Refresh FIRST (the scene clip must re-bind the new mask texture) …
	touch(doc);
	// … then the old mask surface can be released.
	renderer.surfaces.dispose(oldId);
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
	const afterId: SurfaceId = surfaces.copyRegion(beforeId, {
		x: 0,
		y: 0,
		width: doc.width,
		height: doc.height
	});
	eraseSelectionRegion(surfaces, sel.maskId, afterId, doc.width, doc.height);
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
