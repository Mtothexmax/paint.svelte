// Layer: render (pixi). Samples the composited pixel colour at an image-space
// position by reading back the visible layer surfaces (GPU → CPU) and
// compositing them bottom-to-top in STRAIGHT-alpha space (float64).
//
// Each layer's 1×1 texel comes through the float-precision un-premultiply
// blit (divide BEFORE the 8-bit quantize), so soft-edge hue survives: a
// direct 1×1 `extract.pixels` would hand back 8-bit premultiplied bytes whose
// CPU divide cannot recover dark translucent texels (e.g. (28,227,57) for a
// (25,230,70) dab at alpha 9). The per-layer 1×1 blit+read is trivially cheap,
// which matters because this runs on every pointer move for the live readout.
//
// The texels are composited with the straight-over operator in float64.
// Compositing in premultiplied space and un-premultiplying once at the end is
// algebraically identical with exact arithmetic, but with quantized 8-bit
// texels the straight-first order preserves soft-edge hue (±1 at most).

import type { ImageDocument } from '../core/document/ImageDocument';
import type { RGBA } from '../core/color';
import type { EditorRenderer } from './EditorRenderer';
import { extractStraightRegion } from './readback';

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

	// straight-alpha accumulator, 0..1 float64
	let outR = 0;
	let outG = 0;
	let outB = 0;
	let outA = 0;

	for (const layer of doc.layers) {
		if (!layer.visible || layer.opacity <= 0) continue;
		if (!renderer.surfaces.has(layer.surfaceId)) continue;
		// Texel-exact 1x1 straight read (float divide before quantize).
		let d: Uint8ClampedArray;
		try {
			d = extractStraightRegion(renderer, renderer.surfaces.getTexture(layer.surfaceId), px, py, 1, 1).pixels;
		} catch {
			continue;
		}
		const layerOpacity = Math.max(0, Math.min(1, layer.opacity));
		const sa = (d[3] / 255) * layerOpacity;
		if (sa <= 0) continue;
		// Already straight: no CPU divide.
		const sr = d[0] / 255;
		const sg = d[1] / 255;
		const sb = d[2] / 255;
		// Straight-over: out = src·sa + dst·da·(1−sa), renormalized by outA.
		const dstA = outA * (1 - sa);
		outA = sa + dstA;
		if (outA <= 0) {
			outR = 0;
			outG = 0;
			outB = 0;
		} else {
			outR = (sr * sa + outR * (outA - sa)) / outA;
			outG = (sg * sa + outG * (outA - sa)) / outA;
			outB = (sb * sa + outB * (outA - sa)) / outA;
		}
	}

	if (outA <= 0) return { r: 255, g: 255, b: 255, a: 0 };
	// outR/outG/outB already hold the straight-alpha average (renormalized
	// at every step), so no further divide — just quantize once.
	return {
		r: clampByte(outR * 255),
		g: clampByte(outG * 255),
		b: clampByte(outB * 255),
		a: clampByte(outA * 255)
	};
}
