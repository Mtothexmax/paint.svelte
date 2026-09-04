// Layer: render (pixi). Samples the composited pixel colour at an image-space
// position by reading back the visible layer surfaces (GPU → CPU) and
// compositing them bottom-to-top in premultiplied space.
//
// Pixi v8 `extract.pixels` returns premultiplied-alpha bytes, so the "over"
// compositing happens in premultiplied space and the result is unpremultiplied
// once at the end (same convention as `effects.ts`).

import { Sprite } from 'pixi.js';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { RGBA } from '../core/color';
import type { EditorRenderer } from './EditorRenderer';

function clampByte(n: number): number {
	return Math.max(0, Math.min(255, Math.round(n)));
}

/** Composited colour at image pixel (`x`, `y` may be fractional — floored). */
export function sampleCompositeColorAt(
	renderer: EditorRenderer,
	doc: ImageDocument,
	x: number,
	y: number
): RGBA | null {
	const px = Math.floor(x);
	const py = Math.floor(y);
	if (px < 0 || py < 0 || px >= doc.width || py >= doc.height) return null;
	if (!renderer.app) return null;

	// premultiplied accumulator, 0..1
	let outR = 0;
	let outG = 0;
	let outB = 0;
	let outA = 0;

	for (const layer of doc.layers) {
		if (!layer.visible || layer.opacity <= 0) continue;
		if (!renderer.surfaces.has(layer.surfaceId)) continue;
		const sprite = new Sprite(renderer.surfaces.getTexture(layer.surfaceId));
		let extracted;
		try {
			extracted = renderer.app.renderer.extract.pixels({ target: sprite, resolution: 1 });
		} finally {
			sprite.destroy();
		}
		if (!extracted || extracted.width !== doc.width || extracted.height !== doc.height) continue;
		const d = extracted.pixels;
		const i = (py * extracted.width + px) * 4;
		const layerOpacity = Math.max(0, Math.min(1, layer.opacity));
		const sa = (d[i + 3] / 255) * layerOpacity;
		if (sa <= 0) continue;
		const sr = (d[i] / 255) * layerOpacity;
		const sg = (d[i + 1] / 255) * layerOpacity;
		const sb = (d[i + 2] / 255) * layerOpacity;
		outR = sr + outR * (1 - sa);
		outG = sg + outG * (1 - sa);
		outB = sb + outB * (1 - sa);
		outA = sa + outA * (1 - sa);
	}

	if (outA <= 0) return { r: 255, g: 255, b: 255, a: 0 };
	const inv = 1 / outA;
	return {
		r: clampByte(outR * inv * 255),
		g: clampByte(outG * inv * 255),
		b: clampByte(outB * inv * 255),
		a: clampByte(outA * 255)
	};
}
