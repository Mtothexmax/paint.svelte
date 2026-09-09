// Layer: render (pixi). GPU effects applied to the active layer, recorded as a
// reversible surface swap in the doc history (no readbacks). The generic swap
// pipeline lives in the effects module so both legacy adjustments and the
// auto-registered effect system share one implementation.

import { BlurFilter, ColorMatrixFilter, RenderTexture, Sprite, Texture } from 'pixi.js';
import { applyFilterSwap } from '../effects/apply';
import { documentRegistry } from '../core/document/registry';
import type { SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { blitMaskedInto, eraseSelectionRegion } from './selection';
import autoLevelDef from '../effects/adjustments/autoLevel';
import blackAndWhiteDef from '../effects/adjustments/blackAndWhite';
import sepiaDef from '../effects/adjustments/sepia';
import invertAlphaDef from '../effects/adjustments/invertAlpha';

/**
 * Applies a separable Gaussian blur (Pixi BlurFilter) to the active layer's
 * surface, rendering the filtered result off-screen into a NEW surface and
 * swapping the layer's surfaceId. Undo/redo swap between the two surfaces.
 */
export function gaussianBlurActiveLayer(renderer: EditorRenderer, strength: number): boolean {
	if (!(strength > 0)) return false;
	return applyFilterSwap(renderer, 'Gaussian Blur', () => new BlurFilter({ strength, resolution: 1 }));
}

/** Inverts the colours of the active layer (photographic negative). */
export function invertColorsActiveLayer(renderer: EditorRenderer): boolean {
	return applyFilterSwap(renderer, 'Invert Colors', () => {
		const cm = new ColorMatrixFilter();
		// Straight RGBA color inversion (Paint.NET semantics): R' = 1 - R, G' = 1 - G, B' = 1 - B, A' = A
		cm.matrix = [
			-1, 0, 0, 0, 1,
			0, -1, 0, 0, 1,
			0, 0, -1, 0, 1,
			0, 0, 0, 1, 0
		];
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
	cm.matrix = [
		-1, 0, 0, 0, 1,
		0, -1, 0, 0, 1,
		0, 0, -1, 0, 1,
		0, 0, 0, 1, 0
	];
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

/** Applies Auto-Level to the active layer instantly (no dialog). */
export function autoLevelScoped(renderer: EditorRenderer): boolean {
	return applyFilterSwap(renderer, 'Auto-Level', () => autoLevelDef.filter({}));
}

/** Converts the active layer to greyscale instantly (no dialog). */
export function blackAndWhiteScoped(renderer: EditorRenderer): boolean {
	return applyFilterSwap(renderer, 'Black and White', () => blackAndWhiteDef.filter({}));
}

/** Applies a sepia tone to the active layer instantly (no dialog). */
export function sepiaScoped(renderer: EditorRenderer): boolean {
	return applyFilterSwap(renderer, 'Sepia', () => sepiaDef.filter({}));
}

/** Inverts the alpha channel of the active layer instantly (no dialog). */
export function invertAlphaScoped(renderer: EditorRenderer): boolean {
	return applyFilterSwap(renderer, 'Invert Alpha', () => invertAlphaDef.filter({}));
}
