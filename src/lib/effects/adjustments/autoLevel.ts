import { ColorMatrixFilter, Sprite } from 'pixi.js';
import type { EffectDefinition, EffectSettings } from '../types';
import { documentRegistry } from '../../core/document/registry';
import { hasEditorRenderer, getEditorRenderer } from '../../render/EditorRenderer';

// Paint.NET's Auto-Level: per-channel linear stretch to the minimum and
// maximum non-transparent pixel value. The analysis requires a CPU readback,
// which is cached by layer surfaceId so a preview followed by an Apply shares
// a single histogram pass.

interface ChannelLevels {
	lo: [number, number, number];
	hi: [number, number, number];
}

let cacheSurfaceId: string | null = null;
let cacheLevels: ChannelLevels | null = null;

function analyzeLevels(): ChannelLevels | null {
	const doc = documentRegistry.active;
	const layer = doc?.activeLayer;
	if (!doc || !layer || !hasEditorRenderer()) return null;

	if (cacheSurfaceId === layer.surfaceId && cacheLevels) return cacheLevels;

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	if (!surfaces.has(layer.surfaceId)) return null;

	const w = doc.width;
	const h = doc.height;
	const sprite = new Sprite(surfaces.getTexture(layer.surfaceId));
	const extracted = renderer.app.renderer.extract.pixels({ target: sprite, resolution: 1 });
	sprite.destroy();

	if (extracted.width !== w || extracted.height !== h) return null;
	const px = extracted.pixels;

	let rMin = 255, gMin = 255, bMin = 255;
	let rMax = 0, gMax = 0, bMax = 0;

	for (let i = 0; i < px.length; i += 4) {
		const a = px[i + 3];
		if (a === 0) continue;
		// Unpremultiply for the histogram so semi-transparent pixels don't
		// bias toward black.
		let r = px[i], g = px[i + 1], b = px[i + 2];
		if (a < 255) {
			const f = 255 / a;
			r = Math.min(255, Math.round(r * f));
			g = Math.min(255, Math.round(g * f));
			b = Math.min(255, Math.round(b * f));
		}
		if (r < rMin) rMin = r;
		if (g < gMin) gMin = g;
		if (b < bMin) bMin = b;
		if (r > rMax) rMax = r;
		if (g > gMax) gMax = g;
		if (b > bMax) bMax = b;
	}

	// If the layer is fully transparent, leave identity so the image stays
	// untouched (the whole surface is already empty).
	if (rMax <= rMin && gMax <= gMin && bMax <= bMin) {
		cacheLevels = { lo: [0, 0, 0], hi: [1, 1, 1] };
	} else {
		cacheLevels = {
			lo: [rMin / 255, gMin / 255, bMin / 255],
			hi: [
				Math.max(rMin + 1, rMax) / 255,
				Math.max(gMin + 1, gMax) / 255,
				Math.max(bMin + 1, bMax) / 255
			]
		};
	}
	cacheSurfaceId = layer.surfaceId;
	return cacheLevels;
}

// A per-channel contrast stretch is the identity row of the 5×4 matrix when
// lo==0 && hi==1. Otherwise:
//   v' = (v - lo) / (hi - lo)
// In matrix form (operating on straight RGBA):
//   R' = scaleR * R + offsetR
// with scale  = 1/(hi-lo) and offset = -lo/(hi-lo)
function buildMatrix(lv: ChannelLevels): [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] {
	const [lr, lg, lb] = lv.lo;
	const [hr, hg, hb] = lv.hi;
	const sr = 1 / Math.max(hr - lr, 1e-4);
	const sg = 1 / Math.max(hg - lg, 1e-4);
	const sb = 1 / Math.max(hb - lb, 1e-4);
	return [
		sr, 0, 0, 0, -lr * sr,
		0, sg, 0, 0, -lg * sg,
		0, 0, sb, 0, -lb * sb,
		0, 0, 0, 1, 0
	];
}

const definition: EffectDefinition = {
	label: 'Auto-Level',
	icon: '🪜',
	params: [],
	filter: (_settings: EffectSettings) => {
		const lv = analyzeLevels();
		const cm = new ColorMatrixFilter();
		if (lv) cm.matrix = buildMatrix(lv);
		return cm;
	},
	isNoop: () => false
};

export default definition;
