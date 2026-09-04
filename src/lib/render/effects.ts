// Layer: render (pixi). GPU effects applied to the active layer, recorded as a
// reversible surface swap in the doc history (no readbacks).

import { BlurFilter, ColorMatrixFilter, RenderTexture, Sprite, Texture, type Filter } from 'pixi.js';
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
	/** saturation offset: 0 = unchanged, -100 = greyscale, +100 = double */
	sat: number;
	/** lightness offset: 0 = unchanged, -100 = black, +100 = double */
	light: number;
}

/**
 * Hue / Saturation / Lightness adjustment via a composed ColorMatrixFilter.
 * Saturation and lightness are offsets: 0 = unchanged, mapped to factor 1.0.
 */
export function hueSaturationActiveLayer(renderer: EditorRenderer, s: HslSettings): boolean {
	const sat = Math.max(0, (100 + s.sat) / 100);
	const light = Math.max(0, (100 + s.light) / 100);
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

export interface BrightContSettings {
	/** brightness offset: 0 = unchanged, -100 = black, +100 = double */
	brightness: number;
	/** contrast offset: 0 = unchanged, -100 = flat grey, +100 = max */
	contrast: number;
}

/**
 * Brightness / Contrast adjustment using Paint.NET's intensity-based
 * algorithm (from Pinta). At contrast = +100 every pixel becomes either
 * pure black or pure white; at -100 everything collapses to mid-grey.
 * Brightness is applied first, then contrast shifts each channel
 * relative to the pixel's intensity.
 */
export function brightnessContrastActiveLayer(renderer: EditorRenderer, s: BrightContSettings): boolean {
	const doc = documentRegistry.active;
	const layer = doc?.activeLayer;
	if (!doc || !layer) return false;
	if (s.brightness === 0 && s.contrast === 0) return false;

	const surfaces = renderer.surfaces;
	const beforeId = layer.surfaceId;
	const w = doc.width;
	const h = doc.height;

	// Compute the per-pixel lookup table (Pinta algorithm)
	const brightness = s.brightness;
	const contrast = s.contrast;
	const multiply = contrast < 0 ? contrast + 100 : contrast > 0 ? 100 : 1;
	const divide = contrast < 0 ? 100 : contrast > 0 ? 100 - contrast : 1;

		// Read the source surface
		const srcSprite = new Sprite(surfaces.getTexture(beforeId));
		const px = renderer.app.renderer.extract.pixels({ target: srcSprite, resolution: 1 });
		srcSprite.destroy();
		const src = px.pixels;

		// Build result buffer
		const afterId = surfaces.create(w, h);

		if (divide === 0) {
			// Maximum contrast: threshold at 128 → pure black or white
			for (let i = 0; i < src.length; i += 4) {
				if (src[i + 3] === 0) continue;
				const intensity = Math.round(src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);
				const val = (intensity + brightness < 128) ? 0 : 255;
				src[i] = val;
				src[i + 1] = val;
				src[i + 2] = val;
			}
		} else if (divide === 100) {
			for (let i = 0; i < src.length; i += 4) {
				if (src[i + 3] === 0) continue;
				const r = src[i], g = src[i + 1], b = src[i + 2];
				const intensity = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
				const shift = Math.round((intensity - 127) * multiply / divide + 127 - intensity + brightness);
				src[i] = clampByte(r + shift);
				src[i + 1] = clampByte(g + shift);
				src[i + 2] = clampByte(b + shift);
			}
		} else {
			for (let i = 0; i < src.length; i += 4) {
				if (src[i + 3] === 0) continue;
				const r = src[i], g = src[i + 1], b = src[i + 2];
				const intensity = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
				const shift = Math.round((intensity - 127 + brightness) * multiply / divide + 127 - intensity);
				src[i] = clampByte(r + shift);
				src[i + 1] = clampByte(g + shift);
				src[i + 2] = clampByte(b + shift);
			}
		}

		// Upload: put processed pixels into an OffscreenCanvas, create a texture
		// from it, and render onto the target RenderTexture.
		const canvas = new OffscreenCanvas(w, h);
		const ctx = canvas.getContext('2d')!;
		const imgData = ctx.createImageData(w, h);
		imgData.data.set(src);
		ctx.putImageData(imgData, 0, 0);
		const uploadTex = Texture.from(canvas);
		const uploadSprite = new Sprite(uploadTex);
		renderer.app.renderer.render({ container: uploadSprite, target: surfaces.getTexture(afterId), clear: true });
		uploadSprite.destroy();
		uploadTex.destroy(true);

	layer.surfaceId = afterId;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: 'Brightness / Contrast',
		memoryBytes: w * h * 4 * 2,
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

function clampByte(v: number): number {
	return v < 0 ? 0 : v > 255 ? 255 : v;
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
