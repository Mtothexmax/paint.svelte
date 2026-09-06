// Layer: render (pixi). Crop the document to the bounding box of the active
// selection: image dimensions shrink to the selection bbox, all pixel content
// outside the selection becomes transparent. Implemented ONCE here and shared
// by the toolbars of every selection/move tool (and the Image menu).

import { Sprite } from 'pixi.js';
import { documentRegistry } from '../core/document/registry';
import { emptySelection } from '../core/selection/SelectionModel';
import type { Rect } from '../core/geometry';
import type { SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { blitMaskedInto } from './selection';

/** Bounding box (integer, clamped to the surface) of all non-zero-alpha
 * pixels of a mask surface, via a single GPU readback. */
function maskBounds(renderer: EditorRenderer, maskId: SurfaceId, w: number, h: number): Rect | null {
	const sprite = new Sprite(renderer.surfaces.getTexture(maskId));
	const px = renderer.app.renderer.extract.pixels({ target: sprite, resolution: 1 });
	sprite.destroy();
	const data = px.pixels;
	let minX = w, minY = h, maxX = -1, maxY = -1;
	for (let y = 0; y < h; y++) {
		const row = y * w * 4;
		for (let x = 0; x < w; x++) {
			if (data[row + x * 4 + 3] > 0) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}
	}
	if (maxX < 0) return null;
	return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Crops the active document to the bounding box of the current selection.
 * Every layer is reduced to the selection bbox; pixels outside the selection
 * become transparent. Recorded as ONE undoable history entry.
 * Returns false when there is no document/active selection (or an empty mask).
 */
export function cropToSelection(renderer: EditorRenderer): boolean {
	const doc = documentRegistry.active;
	const sel = doc?.selection;
	if (!doc || !sel || !sel.active || !sel.maskId) return false;

	const surfaces = renderer.surfaces;
	const w = doc.width;
	const h = doc.height;
	const bounds = maskBounds(renderer, sel.maskId, w, h);
	if (!bounds) return false;
	if (bounds.width === w && bounds.height === h) return false; // nothing to crop

	// Reduce every layer to the selection content, then take the bbox sub-rect.
	const swaps: { layerId: string; before: SurfaceId; after: SurfaceId }[] = [];
	for (const layer of doc.layers) {
		const maskedId = surfaces.create(w, h);
		blitMaskedInto(surfaces, sel.maskId, layer.surfaceId, maskedId, 'normal', w, h);
		const croppedId = surfaces.copyRegion(maskedId, bounds);
		surfaces.dispose(maskedId);
		swaps.push({ layerId: layer.id, before: layer.surfaceId, after: croppedId });
	}

	const beforeSelection = sel;
	const beforeW = doc.width;
	const beforeH = doc.height;

	for (const s of swaps) {
		const layer = doc.layers.find((l) => l.id === s.layerId);
		if (layer) layer.surfaceId = s.after;
	}
	doc.width = bounds.width;
	doc.height = bounds.height;
	doc.selection = emptySelection();
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: 'Crop to Selection',
		memoryBytes: bounds.width * bounds.height * 4 * swaps.length,
		undo: () => {
			doc.width = beforeW;
			doc.height = beforeH;
			doc.selection = beforeSelection;
			for (const s of swaps) {
				const layer = doc.layers.find((l) => l.id === s.layerId);
				if (layer && layer.surfaceId === s.after) layer.surfaceId = s.before;
			}
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.width = bounds.width;
			doc.height = bounds.height;
			doc.selection = emptySelection();
			for (const s of swaps) {
				const layer = doc.layers.find((l) => l.id === s.layerId);
				if (layer && layer.surfaceId === s.before) layer.surfaceId = s.after;
			}
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {
			const activeAfter = swaps.every((s) => {
				const layer = doc.layers.find((l) => l.id === s.layerId);
				return layer && layer.surfaceId === s.after;
			});
			for (const s of swaps) surfaces.dispose(activeAfter ? s.before : s.after);
		}
	});
	return true;
}
