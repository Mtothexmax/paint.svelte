// Layer: render (pixi). GPU effects applied to the active layer, recorded as a
// reversible surface swap in the doc history (no readbacks).

import { BlurFilter, ColorMatrixFilter, RenderTexture, Sprite, type Filter } from 'pixi.js';
import { documentRegistry } from '../core/document/registry';
import type { EditorRenderer } from './EditorRenderer';

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
