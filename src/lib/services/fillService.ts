// Layer: services. Paint-bucket fill on the active layer. The click seed,
// tolerance and flood mode come from the canvas + the fill settings; the
// actual region mask comes from render/fill (currently a whole-layer
// placeholder — the real flood fill plugs in there and every caller picks it
// up). One undoable surface swap, same pattern as Fill/Delete.

import { get } from 'svelte/store';
import { documentRegistry } from '../core/document/registry';
import type { RGBA } from '../core/color';
import { getEditorRenderer, hasEditorRenderer } from '../render/EditorRenderer';
import { buildFillMaskSurface, intersectMaskWithSelection, paintMaskedColor } from '../render/fill';
import type { SurfaceId } from '../core/layers/Layer';
import { fillTolerance, fillFloodMode } from '../state/fill';

/**
 * Fills from `seed` (image px, may be fractional — snapped here) with
 * `color`. Left button passes the foreground colour, right button the
 * background colour (Paint.NET behaviour). Returns false when there was
 * nothing to do (no doc/layer, seed outside the canvas).
 */
export function applyFill(seedX: number, seedY: number, color: RGBA): boolean {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return false;
	const layer = doc.activeLayer;
	if (!layer) return false;
	const x = Math.floor(seedX);
	const y = Math.floor(seedY);
	if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return false;

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	const mode = get(fillFloodMode);
	const tolerance = get(fillTolerance);

	let maskId: SurfaceId = buildFillMaskSurface(surfaces, doc.width, doc.height, {
		x,
		y,
		tolerance,
		mode
	});
	if (doc.selection.active && doc.selection.maskId && surfaces.has(doc.selection.maskId)) {
		const clipped = intersectMaskWithSelection(surfaces, maskId, doc.selection.maskId, doc.width, doc.height);
		surfaces.dispose(maskId);
		maskId = clipped;
	}

	const beforeId = layer.surfaceId;
	const afterId = surfaces.copyRegion(beforeId, { x: 0, y: 0, width: doc.width, height: doc.height });
	paintMaskedColor(surfaces, afterId, maskId, color, doc.width, doc.height);
	surfaces.dispose(maskId);

	layer.surfaceId = afterId;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: mode === 'global' ? 'Fill' : 'Paint Bucket',
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
