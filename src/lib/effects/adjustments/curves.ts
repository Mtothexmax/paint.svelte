import { Filter, GlProgram, Texture, defaultFilterVert } from 'pixi.js';
import type { EffectDefinition } from '../types';
import { ADJUST_GLSL } from '../shaders';

// Paint.NET Curves — a 256-entry LUT applied per channel.
// The "RGB" (master) curve is applied first; R / G / B curves are applied on
// top of that. The result is baked into a single 256×1 RGBA texture so the
// shader only needs one extra sampler.

export interface CurvePoint {
	x: number;
	y: number;
}

export type CurveChannel = 'rgb' | 'r' | 'g' | 'b';
export type CurveSet = Record<CurveChannel, CurvePoint[]>;

/** Factory default: four straight diagonal curves. */
export const defaultCurveSet: CurveSet = {
	rgb: [
		{ x: 0, y: 0 },
		{ x: 1, y: 1 }
	],
	r: [
		{ x: 0, y: 0 },
		{ x: 1, y: 1 }
	],
	g: [
		{ x: 0, y: 0 },
		{ x: 1, y: 1 }
	],
	b: [
		{ x: 0, y: 0 },
		{ x: 1, y: 1 }
	]
};

// ---------------------------------------------------------------------------
// LUT builder
// ---------------------------------------------------------------------------

/** Catmull-Rom spline with clamped y to [0,1]. Points are sorted by x. */
export function evalCurve(points: CurvePoint[], t: number): number {
	const n = points.length;
	if (n === 0) return t;
	if (t <= points[0].x) return points[0].y;
	if (t >= points[n - 1].x) return points[n - 1].y;

	// find segment
	let i = 0;
	for (i = 0; i < n - 1; i++) {
		if (t >= points[i].x && t <= points[i + 1].x) break;
	}

	const p0 = points[Math.max(0, i - 1)];
	const p1 = points[i];
	const p2 = points[i + 1];
	const p3 = points[Math.min(n - 1, i + 2)];

	const s = (t - p1.x) / Math.max(p2.x - p1.x, 1e-6);

	const y =
		0.5 *
		(2 * p1.y +
			(-p0.y + p2.y) * s +
			(2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s * s +
			(-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s * s * s);

	return Math.max(0, Math.min(1, y));
}

/** Builds a 256-entry Uint8Array for one channel. */
function buildChannelLut(points: CurvePoint[]): Uint8Array {
	const lut = new Uint8Array(256);
	for (let i = 0; i < 256; i++) {
		const v = evalCurve(points, i / 255);
		lut[i] = Math.round(v * 255);
	}
	return lut;
}

/** Builds a pre-composed LUT: for each input index i, out.c = channelC(master(i)). */
function buildComposedLut(set: CurveSet): { r: Uint8Array; g: Uint8Array; b: Uint8Array } {
	const master = buildChannelLut(set.rgb);
	const rlut = buildChannelLut(set.r);
	const glut = buildChannelLut(set.g);
	const blut = buildChannelLut(set.b);
	const r = new Uint8Array(256);
	const g = new Uint8Array(256);
	const b = new Uint8Array(256);
	for (let i = 0; i < 256; i++) {
		r[i] = rlut[master[i]];
		g[i] = glut[master[i]];
		b[i] = blut[master[i]];
	}
	return { r, g, b };
}

// ---------------------------------------------------------------------------
// Texture cache (tiny 1KB textures — cap at 64 and evict oldest)
// ---------------------------------------------------------------------------

let textureCache = new Map<string, Texture>();
const CACHE_LIMIT = 64;

function cacheKey(set: CurveSet): string {
	return JSON.stringify(set);
}

function getLutTexture(set: CurveSet): Texture {
	const key = cacheKey(set);
	const existing = textureCache.get(key);
	if (existing) return existing;

	const { r, g, b } = buildComposedLut(set);
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 1;
	const ctx = canvas.getContext('2d')!;
	const img = ctx.createImageData(256, 1);
	for (let i = 0; i < 256; i++) {
		img.data[i * 4] = r[i];
		img.data[i * 4 + 1] = g[i];
		img.data[i * 4 + 2] = b[i];
		img.data[i * 4 + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
	const tex = Texture.from(canvas);
	if (tex.source) tex.source.scaleMode = 'linear';

	if (textureCache.size >= CACHE_LIMIT) {
		const first = textureCache.keys().next().value;
		if (first !== undefined) {
			const old = textureCache.get(first);
			if (old) old.destroy(true);
			textureCache.delete(first);
		}
	}
	textureCache.set(key, tex);
	return tex;
}

/** Reset the LUT texture cache — called on a full app dispose if ever needed. */
export function clearCurvesCache(): void {
	for (const t of textureCache.values()) t.destroy(true);
	textureCache.clear();
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

const CURVES_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform sampler2D uLut;

${ADJUST_GLSL}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}
		vec3 rgb = vec3(
			texture(uLut, vec2(c.r, 0.5)).r,
			texture(uLut, vec2(c.g, 0.5)).g,
			texture(uLut, vec2(c.b, 0.5)).b
		);
		finalColor = adjustOutput(rgb, c.a);
	}
`;

export function curvesFilter(set: CurveSet): Filter {
	const glProgram = GlProgram.from({
		vertex: defaultFilterVert,
		fragment: CURVES_FRAGMENT,
		name: 'curves'
	});
	return new Filter({
		glProgram,
		resources: { uLut: getLutTexture(set).source }
	});
}

// ---------------------------------------------------------------------------
// Registry definition
// ---------------------------------------------------------------------------

const definition: EffectDefinition = {
	label: 'Curves',
	icon: '📈',
	params: [],
	dialog: 'curves',
	filter: () => curvesFilter(defaultCurveSet),
	isNoop: () => false
};

export default definition;
