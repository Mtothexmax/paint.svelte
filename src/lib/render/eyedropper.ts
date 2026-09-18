// Layer: render (pixi). Samples pixel colours at image-space positions by
// reading back layer surfaces (GPU → CPU) as straight-alpha 1×1 texels.
//
// Each texel comes through the float-precision un-premultiply blit (divide
// BEFORE the 8-bit quantize), so soft-edge hue survives: a direct 1×1
// `extract.pixels` would hand back 8-bit premultiplied bytes whose CPU divide
// cannot recover dark translucent texels (e.g. (28,227,57) for a (25,230,70)
// dab at alpha 9). The per-layer 1×1 blit+read is trivially cheap, which
// matters because this runs on every pointer move for the live readout.
//
// Two sample sources (see state/eyedropper sample mode):
// - merged: all visible layers composited bottom-to-top in STRAIGHT-alpha
//   space (float64) — what you see under the pointer.
// - layer: the active layer alone.
//
// Both read through `exportTextureFor`, i.e. the SAME texture the canvas and
// the PNG export show — including live (never baked) layer effects. Reading
// the raw base surface instead would silently miss those effects.
//
// The texels are composited with the straight-over operator in float64.
// Compositing in premultiplied space and un-premultiplying once at the end is
// algebraically identical with exact arithmetic, but with quantized 8-bit
// texels the straight-first order preserves soft-edge hue (±1 at most).

import type { ImageDocument } from '../core/document/ImageDocument';
import type { Layer } from '../core/layers/Layer';
import type { RGBA } from '../core/color';
import type { Texture } from 'pixi.js';
import type { EditorRenderer } from './EditorRenderer';
import { extractStraightRegion } from './readback';

function clampByte(n: number): number {
	return Math.max(0, Math.min(255, Math.round(n)));
}

interface FloatRgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

/** Texel-exact 1×1 straight read (float divide before quantize), 0..1 floats. */
function readTexel(renderer: EditorRenderer, texture: Texture, px: number, py: number): FloatRgba | null {
	let d: Uint8ClampedArray;
	try {
		d = extractStraightRegion(renderer, texture, px, py, 1, 1).pixels;
	} catch {
		return null;
	}
	return { r: d[0] / 255, g: d[1] / 255, b: d[2] / 255, a: d[3] / 255 };
}

function quantize(outR: number, outG: number, outB: number, outA: number): RGBA {
	if (outA <= 0) return { r: 255, g: 255, b: 255, a: 0 };
	// Already the straight-alpha average (renormalized at every step), so no
	// further divide — just quantize once.
	return {
		r: clampByte(outR * 255),
		g: clampByte(outG * 255),
		b: clampByte(outB * 255),
		a: clampByte(outA * 255)
	};
}

/** The texture a layer displays: live-effect chain when it has enabled
 * effects, otherwise the raw base surface. */
function displayTextureOf(renderer: EditorRenderer, layer: Layer): Texture | null {
	try {
		return renderer.exportTextureFor(layer) ?? renderer.surfaces.getTexture(layer.surfaceId);
	} catch {
		return null;
	}
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
		// Live effects included: same texture the canvas shows.
		const tex = displayTextureOf(renderer, layer);
		if (!tex) continue;
		const t = readTexel(renderer, tex, px, py);
		if (!t) continue;
		const layerOpacity = Math.max(0, Math.min(1, layer.opacity));
		const sa = t.a * layerOpacity;
		if (sa <= 0) continue;
		// Already straight: no CPU divide.
		// Straight-over: out = src·sa + dst·da·(1−sa), renormalized by outA.
		const dstA = outA * (1 - sa);
		outA = sa + dstA;
		if (outA <= 0) {
			outR = 0;
			outG = 0;
			outB = 0;
		} else {
			outR = (t.r * sa + outR * (outA - sa)) / outA;
			outG = (t.g * sa + outG * (outA - sa)) / outA;
			outB = (t.b * sa + outB * (outA - sa)) / outA;
		}
	}

	return quantize(outR, outG, outB, outA);
}

/** The active layer's own colour at an image pixel (live effects and layer
 * opacity applied, nothing else composited) — `null` outside the canvas or
 * when the layer can't be read. */
export function sampleLayerColorAt(
	renderer: EditorRenderer,
	doc: ImageDocument,
	layer: Layer,
	x: number,
	y: number
): RGBA | null {
	const px = Math.floor(x);
	const py = Math.floor(y);
	if (px < 0 || py < 0 || px >= doc.width || py >= doc.height) return null;
	if (!renderer.app) return null;
	if (!renderer.surfaces.has(layer.surfaceId)) return null;
	// Live effects included: same texture the canvas shows.
	const tex = displayTextureOf(renderer, layer);
	if (!tex) return null;
	const t = readTexel(renderer, tex, px, py);
	if (!t) return null;
	const sa = t.a * Math.max(0, Math.min(1, layer.opacity));
	if (sa <= 0) return { r: 255, g: 255, b: 255, a: 0 };
	// Single layer: its straight colour is already the average — only the
	// alpha carries the opacity.
	return quantize(t.r, t.g, t.b, sa);
}
