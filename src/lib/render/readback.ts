// Layer: render. Shared GPU readback helper: samples RGBA bytes at image-space
// points of a layer/mask surface via a single extract.pixels call. Used by the
// headless effect probes to assert pixel-level correctness (e.g. that a filter
// respected the selection). Mirrors the exact pattern MoveEngine/crop use.

import { Sprite } from 'pixi.js';
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