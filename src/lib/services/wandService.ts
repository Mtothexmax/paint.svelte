// Layer: services. Magic-wand selection: grows the SAME flood-fill region as
// the paint bucket (render/fill — tolerance + contiguous/global scope) but
// commits it as a SELECTION instead of paint. The result is a composite
// (mask-authoritative) selection like add/subtract shapes produce, so ants,
// move, delete and effects all work unchanged. Selections are not undoable
// in this app (same as the shape tools).

import { get } from 'svelte/store';
import { documentRegistry } from '../core/document/registry';
import { getEditorRenderer, hasEditorRenderer } from '../render/EditorRenderer';
import { buildFillMaskSurface, maskHasContent } from '../render/fill';
import { boundsOfLoops, subtractMasks, unionMasks } from '../render/selection';
import type { SelectionMode } from '../state/ui';
import { fillTolerance, fillFloodMode } from '../state/fill';

/**
 * Wand outcome (drives the canvas notice):
 * - 'ok': selection committed;
 * - 'out-of-bounds': seed outside the canvas;
 * - 'empty': no matching pixels (e.g. tolerance 0 on a dithered edge);
 * - 'no-selection': subtract mode with nothing selected;
 * - 'failed': no doc/layer or the mask build failed.
 */
export type WandResult = 'ok' | 'out-of-bounds' | 'empty' | 'no-selection' | 'failed';

/**
 * Selects the flood region at `seed` (image px, may be fractional — snapped
 * here) under `mode` (replace/add/subtract — Ctrl/Shift/Alt and right-button
 * behave like the other selection tools). Tolerance + contiguous/global come
 * from the shared fill settings.
 */
export function applyWandSelection(seedX: number, seedY: number, mode: SelectionMode): WandResult {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return 'failed';
	const layer = doc.activeLayer;
	if (!layer) return 'failed';
	const x = Math.floor(seedX);
	const y = Math.floor(seedY);
	if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return 'out-of-bounds';

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	const tolerance = get(fillTolerance);
	const floodMode = get(fillFloodMode);
	console.info('[wand]', `click=(${x},${y}) tol=${tolerance} mode=${floodMode} selMode=${mode}`);

	const wandMask = buildFillMaskSurface(renderer, layer.surfaceId, doc.width, doc.height, {
		x,
		y,
		tolerance,
		mode: floodMode
	});
	if (!wandMask) return 'failed';
	if (!maskHasContent(renderer, wandMask, doc.width, doc.height)) {
		surfaces.dispose(wandMask);
		return 'empty';
	}

	const sel = doc.selection;
	const hasCurrent = sel.active && sel.maskId && surfaces.has(sel.maskId);
	if (mode === 'subtract' && !hasCurrent) {
		surfaces.dispose(wandMask);
		return 'no-selection';
	}

	if (mode === 'replace' || !hasCurrent) {
		const cur = sel.maskId;
		sel.maskId = wandMask;
		sel.active = true;
		sel.kind = 'lasso';
		sel.rect = null;
		sel.points = null;
		sel.composite = true;
		sel.inverted = false;
		sel.outlineLoops = renderer.computeMaskOutline(wandMask, doc.width, doc.height);
		sel.bounds = sel.outlineLoops.length ? boundsOfLoops(sel.outlineLoops) : null;
		renderer.refreshActiveSelection();
		documentRegistry.notifyChange(doc);
		if (cur && cur !== wandMask && surfaces.has(cur)) surfaces.dispose(cur);
		return 'ok';
	}

	const cur = sel.maskId!;
	const combined =
		mode === 'add'
			? unionMasks(surfaces, cur, wandMask, doc.width, doc.height)
			: subtractMasks(surfaces, cur, wandMask, doc.width, doc.height);
	surfaces.dispose(wandMask);
	sel.maskId = combined;
	sel.active = true;
	sel.composite = true;
	sel.inverted = false;
	sel.rect = null;
	sel.points = null;
	sel.outlineLoops = renderer.computeMaskOutline(combined, doc.width, doc.height);
	sel.bounds = sel.outlineLoops.length ? boundsOfLoops(sel.outlineLoops) : null;
	renderer.refreshActiveSelection();
	documentRegistry.notifyChange(doc);
	if (cur !== combined && surfaces.has(cur)) surfaces.dispose(cur);
	// A subtract that empties the selection leaves no ants — drop it cleanly.
	if (mode === 'subtract' && !sel.outlineLoops.length) {
		sel.active = false;
		renderer.refreshActiveSelection();
		documentRegistry.notifyChange(doc);
	}
	return 'ok';
}
