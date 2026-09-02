// Layer: render (pixi). GPU effects applied to the active layer, recorded as a
// reversible surface swap in the doc history (no readbacks).

import { BlurFilter, ColorMatrixFilter, RenderTexture, Sprite, type Filter } from 'pixi.js';
import { documentRegistry } from '../core/document/registry';
import type { SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { blitMaskedInto, eraseSelectionRegion } from './selection';

/** Applies an arbitrary filter off-screen and swaps the layer surface (undoable). */
function applyFilterSwap(
	renderer: EditorRenderer,
	label: string,
	makeFilter: () => Filter
): boolean {
	const doc = documentRegistry.active;
	const layer = doc?.activeLayer;
	if (!doc || !layer) return false;

	const surfaces = renderer.surfaces;
	const src = surfaces.getTexture(layer.surfaceId);
	const target = RenderTexture.create({ width: doc.width, height: doc.height, resolution: 1 });

	const sprite = new Sprite(src);
	const filter = makeFilter();
	sprite.filters = [filter];
	renderer.app.renderer.render({ container: sprite, target, clear: true });
	sprite.destroy();
	filter.destroy();

	const before = layer.surfaceId;
	const after = surfaces.adopt(target);
	layer.surfaceId = after;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label,
		memoryBytes: doc.width * doc.height * 4 * 2,
		undo: () => {
			if (layer.surfaceId === after) {
				layer.surfaceId = before;
				renderer.rebuildActiveLayers();
			}
		},
		redo: () => {
			if (layer.surfaceId === before) {
				layer.surfaceId = after;
				renderer.rebuildActiveLayers();
			}
		},
		dispose: () => {
			if (layer.surfaceId === after) surfaces.dispose(before);
			else surfaces.dispose(after);
		}
	});
	return true;
}

/**
 * Applies a separable Gaussian blur (Pixi BlurFilter) to the active layer's
 * surface, rendering the filtered result off-screen into a NEW surface and
 * swapping the layer's surfaceId. Undo/redo swap between the two surfaces.
 */
export function gaussianBlurActiveLayer(renderer: EditorRenderer, strength: number): boolean {
	if (!(strength > 0)) return false;
	return applyFilterSwap(renderer, 'Gaussian Blur', () => new BlurFilter({ strength, resolution: 1 }));
}

export interface HslSettings {
	/** hue rotation in degrees (-180..180) */
	hue: number;
	/** saturation factor: 100 = unchanged, 0 = greyscale, 200 = double */
	sat: number;
	/** lightness/brightness factor: 100 = unchanged */
	light: number;
}

/**
 * Hue / Saturation / Lightness adjustment via a composed ColorMatrixFilter.
 */
export function hueSaturationActiveLayer(renderer: EditorRenderer, s: HslSettings): boolean {
	const sat = Math.max(0, s.sat) / 100;
	const light = Math.max(0, s.light) / 100;
	return applyFilterSwap(renderer, 'Hue/Saturation', () => {
		const cm = new ColorMatrixFilter();
		cm.saturate(sat, true);
		cm.hue(s.hue, true);
		cm.brightness(light, true);
		return cm;
	});
}

/** Inverts the colours of the active layer (photographic negative). */
export function invertColorsActiveLayer(renderer: EditorRenderer): boolean {
	return applyFilterSwap(renderer, 'Invert Colors', () => {
		const cm = new ColorMatrixFilter();
		cm.negative(true);
		return cm;
	});
}

/** Renders an inverted (negative) copy of surface `srcId` into a NEW owned
 * surface and returns its id (the original is left untouched). */
function invertSurfaceCopy(renderer: EditorRenderer, srcId: SurfaceId, width: number, height: number): SurfaceId {
	const surfaces = renderer.surfaces;
	const src = surfaces.getTexture(srcId);
	const target = RenderTexture.create({ width, height, resolution: 1 });
	const sprite = new Sprite(src);
	const cm = new ColorMatrixFilter();
	cm.negative(true);
	sprite.filters = [cm];
	renderer.app.renderer.render({ container: sprite, target, clear: true });
	sprite.destroy();
	cm.destroy();
	return surfaces.adopt(target);
}

/**
 * Inverts the colours of the ACTIVE LAYER, but ONLY inside the current
 * selection when one is active (Paint.NET semantics); without a selection the
 * whole layer is inverted. Always recorded as a single undoable surface swap.
 */
export function invertColorsScoped(renderer: EditorRenderer): boolean {
	const doc = documentRegistry.active;
	const layer = doc?.activeLayer;
	if (!doc || !layer) return false;
	const sel = doc.selection;
	if (!(sel.active && sel.maskId)) return invertColorsActiveLayer(renderer);

	const surfaces = renderer.surfaces;
	const beforeId = layer.surfaceId;

	// Surface-swap undo: never mutate the live layer surface in place.
	const afterId: SurfaceId = surfaces.copyRegion(beforeId, { x: 0, y: 0, width: doc.width, height: doc.height });
	// Clear the selected area in the clone …
	eraseSelectionRegion(surfaces, sel.maskId, afterId, doc.width, doc.height);
	// … then compose the inverted copy ONLY inside the selection.
	const invertedId = invertSurfaceCopy(renderer, beforeId, doc.width, doc.height);
	blitMaskedInto(surfaces, sel.maskId, invertedId, afterId, 'normal', doc.width, doc.height);
	surfaces.dispose(invertedId);

	layer.surfaceId = afterId;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: 'Invert Colors',
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
