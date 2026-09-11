// Layer: render. Shared GPU readback helper: samples RGBA bytes at image-space
// points of a layer/mask surface via a single extract.pixels call. Used by the
// headless effect probes to assert pixel-level correctness (e.g. that a filter
// respected the selection). Mirrors the exact pattern MoveEngine/crop use.

import { Sprite, type Texture } from 'pixi.js';
import type { SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';

/**
 * Returns one RGBA tuple per requested point (premultiplied-alpha bytes, the
 * format Pixi surfaces are stored in). Points are clamped into the surface.
 */
export function sampleSurfacePixels(
	renderer: EditorRenderer,
	surfaceId: SurfaceId,
	width: number,
	height: number,
	points: Array<{ x: number; y: number }>
): number[][] {
	const sprite = new Sprite(renderer.surfaces.getTexture(surfaceId));
	const extracted = renderer.app.renderer.extract.pixels({ target: sprite, resolution: 1 });
	sprite.destroy();
	const data = extracted.pixels;
	if (extracted.width !== width || extracted.height !== height) {
		throw new Error(`readback size mismatch: ${extracted.width}x${extracted.height} != ${width}x${height}`);
	}
	return points.map(({ x, y }) => {
		const px = Math.max(0, Math.min(width - 1, Math.round(x)));
		const py = Math.max(0, Math.min(height - 1, Math.round(y)));
		const i = (py * width + px) * 4;
		return [data[i], data[i + 1], data[i + 2], data[i + 3]];
	});
}

/** Raw RGBA bytes of a whole surface (row-major, 4 bytes per pixel). Used by
 * UI that needs full-pixel access (e.g. the Levels histogram). */
export interface SurfaceBytes {
	pixels: Uint8ClampedArray;
	width: number;
	height: number;
}

export function extractSurfaceBytes(renderer: EditorRenderer, surfaceId: SurfaceId): SurfaceBytes {
	const sprite = new Sprite(renderer.surfaces.getTexture(surfaceId));
	const extracted = renderer.app.renderer.extract.pixels({ target: sprite, resolution: 1 });
	sprite.destroy();
	return { pixels: extracted.pixels, width: extracted.width, height: extracted.height };
}

/**
 * Reads a texture back as a STRAIGHT-alpha canvas (correct PNG/2D pixels).
 *
 * Pixi v8's GL readback returns premultiplied bytes and its built-in
 * un-premultiply is compiled out (`if (false)` in GlTextureSystem.getPixels),
 * so `extract.canvas` hands you premultiplied RGB disguised as straight
 * alpha. Encoding that straight to PNG (session snapshots, export,
 * clipboard) bakes the premultiplication in: every save/restore cycle
 * multiplies soft-edge RGB by alpha again, so translucent edges get
 * progressively darker. Flood-fill matching and thumbnails read the same
 * wrong bytes. Un-premultiplying once here fixes all of them.
 *
 * Fully transparent pixels are zeroed (canonical straight alpha, and it
 * compresses better); fully opaque pixels are copied exactly.
 */
export function extractStraightCanvas(renderer: EditorRenderer, texture: Texture): HTMLCanvasElement {
	const probe = new Sprite(texture);
	const extracted = renderer.app.renderer.extract.pixels({ target: probe, resolution: 1 });
	probe.destroy();
	const w = extracted.width;
	const h = extracted.height;
	const src = extracted.pixels;
	const straight = new Uint8ClampedArray(src.length);
	for (let i = 0; i < src.length; i += 4) {
		const a = src[i + 3];
		straight[i + 3] = a;
		if (a === 0) {
			straight[i] = 0;
			straight[i + 1] = 0;
			straight[i + 2] = 0;
		} else if (a === 255) {
			straight[i] = src[i];
			straight[i + 1] = src[i + 1];
			straight[i + 2] = src[i + 2];
		} else {
			// Pixi's own un-premultiply formula (255.001/a, truncated).
			const m = 255.001 / a;
			straight[i] = Math.min(255, Math.floor(src[i] * m + 0.5));
			straight[i + 1] = Math.min(255, Math.floor(src[i + 1] * m + 0.5));
			straight[i + 2] = Math.min(255, Math.floor(src[i + 2] * m + 0.5));
		}
	}
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d')!;
	ctx.putImageData(new ImageData(straight, w, h), 0, 0);
	return canvas;
}
