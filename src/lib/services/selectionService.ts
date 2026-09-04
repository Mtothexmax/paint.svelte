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
	boundsOfLoops,
	complementMaskSurface,
	fillSelectionRegion,
	fillShapeMask,
	invertSelectionMask,
	maskAll,
	subtractSelection,
	unionSelection
} from '../render/selection';
import { clamp } from '../core/geometry';
import { showNotice } from '../state/ui';

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
		sel.composite = false;
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
		sel.composite = false;
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
		sel.composite = false;
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
 * Inverts the current selection (mask complement). Simple selections rewrite
 * the pooled mask in place from their geometry (`rect`/`points` always
 * describe the POSITIVE shape, `inverted` flips so the mask matches);
 * inverting again restores the original positive selection. Combined
 * (composite) selections have no single geometry — their mask is complemented
 * GPU-side as a new surface and the ants/bounds are re-derived from the mask.
 */
export function invertSelection(): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	const sel = doc.selection;
	if (!sel.active || !sel.maskId) return false;

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;

	if (sel.composite) {
		const oldMaskId = sel.maskId;
		const complement = complementMaskSurface(surfaces, oldMaskId, doc.width, doc.height);
		const loops = renderer.computeMaskOutline(complement, doc.width, doc.height);
		if (!loops.length) {
			// the previous selection covered the whole document — nothing remains
			surfaces.dispose(complement);
			deselect();
			return true;
		}
		sel.maskId = complement;
		sel.outlineLoops = loops;
		sel.bounds = boundsOfLoops(loops);
		touch(doc);
		if (surfaces.has(oldMaskId)) surfaces.dispose(oldMaskId);
		return true;
	}

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
		if (sel.outlineLoops?.length) {
			const points = sel.outlineLoops.flat();
			const xs = points.map((point) => point.x);
			const ys = points.map((point) => point.y);
			sel.bounds = {
				x: Math.min(...xs),
				y: Math.min(...ys),
				width: Math.max(...xs) - Math.min(...xs),
				height: Math.max(...ys) - Math.min(...ys)
			};
		} else {
			sel.bounds = null;
		}
	} else {
		// Complement -> restore the positive shape.
		fillShapeMask(surfaces, sel.maskId, doc.width, doc.height, sel.kind, sel.rect, sel.points);
		sel.inverted = false;
		sel.composite = false;
		sel.bounds = sel.rect && sel.rect.width > 0 ? { ...sel.rect } : null;
	}

	touch(doc);
	return true;
}

/**
 * Applies a selection gesture under the given mode. `mode='replace'` sets a new
 * selection; `mode='add'` unions the new shape into the current selection;
 * `mode='subtract'` removes it. Works for rect/ellipse (drag endpoints `a`,`b`)
 * and lasso/polygon (`points`). Add/subtract produce a mask-authoritative
 * (composite) selection.
 */
export function applySelectionMode(
	mode: 'replace' | 'add' | 'subtract',
	kind: 'rect' | 'ellipse' | 'lasso',
	a: Point,
	b: Point,
	points: Point[]
): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;

	const rect = kind === 'lasso' ? null : normalizedRect(a, b);
	const geomPts = kind === 'lasso' ? clampedPoints(points, doc) : null;
	if (kind === 'lasso') {
		if (!geomPts || geomPts.length < 2) return false;
	} else if (!rect || rect.width < 1 || rect.height < 1) {
		return false;
	}

	if (mode === 'replace') {
		return kind === 'lasso' ? setLassoSelection(geomPts ?? []) : setRectSelection(kind, a, b);
	}

	const sel = doc.selection;
	// No current selection yet → add acts like replace; subtract has nothing to remove.
	if (!sel.active || !sel.maskId || !surfaces.has(sel.maskId)) {
		if (mode === 'subtract') {
			showNotice('Nothing to subtract from.');
			return false;
		}
		return kind === 'lasso' ? setLassoSelection(geomPts ?? []) : setRectSelection(kind, a, b);
	}

	const cur = sel.maskId;
	const newMask =
		mode === 'add'
			? unionSelection(surfaces, cur, doc.width, doc.height, kind, rect, geomPts)
			: subtractSelection(surfaces, cur, doc.width, doc.height, kind, rect, geomPts);

	sel.maskId = newMask;
	sel.composite = true;
	sel.outlineLoops = renderer.computeMaskOutline(newMask, doc.width, doc.height);
	sel.inverted = false;
	sel.active = true;
	sel.rect = kind === 'lasso' ? null : rect;
	sel.points = kind === 'lasso' ? geomPts : null;
	if (sel.outlineLoops?.length) {
		const points = sel.outlineLoops.flat();
		const xs = points.map((point) => point.x);
		const ys = points.map((point) => point.y);
		sel.bounds = {
			x: Math.min(...xs),
			y: Math.min(...ys),
			width: Math.max(...xs) - Math.min(...xs),
			height: Math.max(...ys) - Math.min(...ys)
		};
	} else {
		sel.bounds = null;
	}

	touch(doc);
	if (cur !== newMask && surfaces.has(cur)) surfaces.dispose(cur);
	return true;
}

/**
 * Applies a selection given an already-normalized `rect` (used by the Fixed-Size
 * rectangle mode, where the box is freely placed rather than anchored to a
 * drag corner). `mode` behaves exactly as in `applySelectionMode`.
 */
export function applySelectionRect(mode: 'replace' | 'add' | 'subtract', kind: 'rect' | 'ellipse', rect: Rect): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	if (!rect || rect.width < 1 || rect.height < 1) return false;
	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;

	const setPositive = (): boolean => {
		const maskId = renderer.ensureSelectionMask(doc);
		const bounds = fillShapeMask(surfaces, maskId, doc.width, doc.height, kind, rect, null);
		if (!bounds) return false;
		const sel = doc.selection;
		sel.active = true;
		sel.kind = kind;
		sel.rect = rect;
		sel.points = null;
		sel.bounds = bounds;
		sel.inverted = false;
		sel.composite = false;
		touch(doc);
		return true;
	};

	if (mode === 'replace') return setPositive();

	const sel = doc.selection;
	if (!sel.active || !sel.maskId || !surfaces.has(sel.maskId)) {
		if (mode === 'subtract') {
			showNotice('Nothing to subtract from.');
			return false;
		}
		return setPositive();
	}

	const cur = sel.maskId;
	const newMask =
		mode === 'add'
			? unionSelection(surfaces, cur, doc.width, doc.height, kind, rect, null)
			: subtractSelection(surfaces, cur, doc.width, doc.height, kind, rect, null);

	sel.maskId = newMask;
	sel.composite = true;
	sel.outlineLoops = renderer.computeMaskOutline(newMask, doc.width, doc.height);
	sel.inverted = false;
	sel.active = true;
	sel.rect = rect;
	sel.points = null;
	if (sel.outlineLoops?.length) {
		const points = sel.outlineLoops.flat();
		const xs = points.map((point) => point.x);
		const ys = points.map((point) => point.y);
		sel.bounds = {
			x: Math.min(...xs),
			y: Math.min(...ys),
			width: Math.max(...xs) - Math.min(...xs),
			height: Math.max(...ys) - Math.min(...ys)
		};
	} else {
		sel.bounds = null;
	}

	touch(doc);
	if (cur !== newMask && surfaces.has(cur)) surfaces.dispose(cur);
	return true;
}

/**
 * Deletes (erases to transparency) the active layer's pixels inside the
 * selection — one undoable surface swap, like a brush stroke. `label` names
 * the history entry ('Cut' reuses this path). Returns false when there is
 * nothing to delete.
 */
export function deleteSelection(label = 'Delete'): boolean {
	const doc = activeDoc();
	if (!doc || !hasEditorRenderer()) return false;
	const sel = doc.selection;
	const layer = doc.activeLayer;
	if (!doc || !sel.active || !sel.maskId || !layer) return false;

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	if (!surfaces.has(sel.maskId) || !surfaces.has(layer.surfaceId)) return false;

	// Surface-swap undo: never mutate the live layer surface in place.
	const beforeId = layer.surfaceId;

	// "Keep" mask = the pixels that must SURVIVE the delete (the complement of
	// the current selection MASK). Working from the mask surface itself covers
	// every selection type uniformly: simple shapes, complements (donuts) and
	// combined add/subtract regions. Rebuilding the result onto a fresh
	// transparent surface from this mask guarantees the deleted region becomes
	// exactly #00000000 — no premultiplied RGB residue from an 'erase' pass.
	const keepId = complementMaskSurface(surfaces, sel.maskId, doc.width, doc.height);
	const afterId: SurfaceId = surfaces.create(doc.width, doc.height); // fully transparent
	blitMaskedInto(surfaces, keepId, beforeId, afterId, 'normal', doc.width, doc.height);
	surfaces.dispose(keepId);

	layer.surfaceId = afterId;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label,
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
