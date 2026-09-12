// Layer: render. Shared GPU readback helper: samples STRAIGHT-alpha RGBA
// bytes at image-space points of a layer/mask surface. Used by the headless
// effect probes to assert pixel-level correctness (e.g. that a filter
// respected the selection), and by every encode path (export, session,
// clipboard, thumbnails) plus histograms and fill analysis.

import { Container, Geometry, GlProgram, Mesh, Shader, Sprite, type Texture } from 'pixi.js';
import type { SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { createU8Texture } from './surfaceTexture';

/**
 * Un-premultiply in float precision (one division per pixel, in the shader)
 * then quantize once to U8. Sampling a float surface through this shader
 * into a U8 target is the single quantization point for every encode/read
 * path: export, session, clipboard, thumbnails, histograms.
 *
 * Doing the divide BEFORE the 8-bit quantize (rather than quantizing
 * premultiplied bytes and dividing on the CPU) preserves soft-edge hue:
 * premultiplied 8-bit rounds dark translucent texels toward black and the
 * CPU divide cannot recover them.
 *
 * IMPLEMENTATION NOTE: this deliberately does NOT use the Filter API
 * (`makeGlFilter`). Pixi's FilterSystem renders the filtered object into a
 * pooled 8-bit temp texture BEFORE running the filter, so a filter would
 * divide already-quantized bytes (identical to the old CPU path). A Mesh
 * with a custom Shader instead draws straight into the U8 target: the
 * texture sample is full float, the divide happens in float, and the single
 * U8 quantize is the write to the target. (A Mesh with a custom shader
 * never batches, so the draw is always direct.)
 */
const UNPREMULT_VERT = `
	in vec2 aPosition;
	in vec2 aUV;
	out vec2 vUV;
	uniform mat3 uTextureMatrix;

	void main()
	{
		vUV = (uTextureMatrix * vec3(aUV, 1.0)).xy;
		gl_Position = vec4(aPosition, 0.0, 1.0);
	}
`;

const UNPREMULT_FRAG = `
	in vec2 vUV;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	void main()
	{
		vec4 c = texture(uTexture, vUV);
		if (c.a <= 0.0) { finalColor = vec4(0.0, 0.0, 0.0, 0.0); return; }
		if (c.a >= 1.0) { finalColor = c; return; }
		finalColor = vec4(clamp(c.rgb / c.a, 0.0, 1.0), c.a);
	}
`;

// Fullscreen triangle in clip space. Positions ignore every transform by
// construction; the UVs select which source region maps onto the target:
// the visible clip quad [-1,1]^2 interpolates the triangle UVs back to the
// [u0,u1]x[v0,v1] window, so target texel (dx,dy) samples source texel
// (rx+dx, ry+dy) at exact texel centers (linear sampling at a texel center
// returns that texel exactly). Orientation (flip) is handled by
// uTextureMatrix, exactly as in the full-surface blit.
const BLIT_POSITIONS = new Float32Array([-1, -1, 3, -1, -1, 3]);

/**
 * Blits a source region through the un-premultiply shader into a fresh
 * `targetW`x`targetH` U8 target and returns it. The caller owns the returned
 * texture (must destroy). Region coordinates are image-space pixels
 * (top-left origin), matching `extract.pixels` frame semantics. When the
 * target size differs from the region size the GPU scales while dividing,
 * so there is still exactly one quantization.
 */
export function blitStraightRegion(
	renderer: EditorRenderer,
	texture: Texture,
	rx: number,
	ry: number,
	rw: number,
	rh: number,
	targetW?: number,
	targetH?: number
): import('pixi.js').RenderTexture {
	const w = Math.max(1, Math.round(targetW ?? rw));
	const h = Math.max(1, Math.round(targetH ?? rh));
	const sw = Math.max(1, texture.width);
	const sh = Math.max(1, texture.height);
	const u0 = rx / sw;
	const v0 = ry / sh;
	const uw = Math.max(1, Math.round(rw)) / sw;
	const vh = Math.max(1, Math.round(rh)) / sh;
	const rt = createU8Texture(w, h);
	const source = texture.source;
	const glProgram = GlProgram.from({
		vertex: UNPREMULT_VERT,
		fragment: UNPREMULT_FRAG,
		name: 'unpremultiply-blit'
	});
	const shader = new Shader({
		glProgram,
		resources: {
			uTexture: source,
			uSampler: source.style,
			textureUniforms: {
				uTextureMatrix: { type: 'mat3x3<f32>', value: texture.textureMatrix.mapCoord }
			}
		}
	});
	const geometry = new Geometry({
		attributes: {
			aPosition: BLIT_POSITIONS,
			aUV: new Float32Array([u0, v0, u0 + 2 * uw, v0, u0, v0 + 2 * vh])
		}
	});
	const mesh = new Mesh({ geometry, shader });
	// Verbatim copy: the target is cleared first, so normal blending over
	// transparent black is the identity (out = src).
	const holder = new Container();
	holder.addChild(mesh);
	renderer.app.renderer.render({ container: holder, target: rt, clear: true });
	holder.destroy({ children: true });
	geometry.destroy();
	shader.destroy(true);
	glProgram.destroy();
	return rt;
}

/**
 * Blits `texture` through the un-premultiply shader into a fresh U8 target
 * and returns it. The caller owns the returned texture (must destroy).
 * A `width`/`height` differing from the texture size scales while dividing
 * (single quantization), mirroring the old sprite-blit contract.
 */
export function blitStraightToU8(
	renderer: EditorRenderer,
	texture: Texture,
	width?: number,
	height?: number
): import('pixi.js').RenderTexture {
	const w = Math.max(1, Math.round(width ?? texture.width));
	const h = Math.max(1, Math.round(height ?? texture.height));
	return blitStraightRegion(renderer, texture, 0, 0, texture.width, texture.height, w, h);
}

/**
 * Reads an image-space region of a texture back as STRAIGHT-alpha U8 bytes.
 * Region coordinates use a top-left origin (same convention as
 * `extract.pixels` frames). Used for small reads (eyedropper 1x1, recolor
 * patches) where a full-surface extraction would be wasteful.
 */
export function extractStraightRegion(
	renderer: EditorRenderer,
	texture: Texture,
	x: number,
	y: number,
	w: number,
	h: number
): { pixels: Uint8ClampedArray; width: number; height: number } {
	const rt = blitStraightRegion(renderer, texture, x, y, w, h);
	const probe = new Sprite(rt);
	const extracted = renderer.app.renderer.extract.pixels({ target: probe, resolution: 1 });
	probe.destroy();
	const out = new Uint8ClampedArray(extracted.pixels);
	const ew = extracted.width;
	const eh = extracted.height;
	rt.destroy(true);
	return { pixels: out, width: ew, height: eh };
}

/**
 * Reads a texture back as STRAIGHT-alpha U8 bytes (correct PNG/2D pixels).
 * The divide happens in the shader (float precision) before quantization,
 * so soft edges keep their hue. Alpha-only callers are unaffected.
 */
export function extractStraightBytes(
	renderer: EditorRenderer,
	texture: Texture,
	width?: number,
	height?: number
): { pixels: Uint8ClampedArray; width: number; height: number } {
	const rt = blitStraightToU8(renderer, texture, width, height);
	const probe = new Sprite(rt);
	const extracted = renderer.app.renderer.extract.pixels({ target: probe, resolution: 1 });
	probe.destroy();
	const out = new Uint8ClampedArray(extracted.pixels);
	const w = extracted.width;
	const h = extracted.height;
	rt.destroy(true);
	return { pixels: out, width: w, height: h };
}

/**
 * Returns one RGBA tuple per requested point (STRAIGHT-alpha bytes: the
 * shader un-premultiplies in float before the 8-bit quantize). Points are
 * clamped into the surface.
 */
export function sampleSurfacePixels(
	renderer: EditorRenderer,
	surfaceId: SurfaceId,
	width: number,
	height: number,
	points: Array<{ x: number; y: number }>
): number[][] {
	const { pixels: data, width: w, height: h } = extractStraightBytes(
		renderer,
		renderer.surfaces.getTexture(surfaceId),
		width,
		height
	);
	if (w !== width || h !== height) {
		throw new Error(`readback size mismatch: ${w}x${h} != ${width}x${height}`);
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
	return extractStraightBytes(renderer, renderer.surfaces.getTexture(surfaceId));
}

/**
 * Reads a texture back as a STRAIGHT-alpha canvas (correct PNG/2D pixels).
 *
 * Surfaces store premultiplied color, so every encode path (session
 * snapshots, export, clipboard) must un-premultiply exactly once or
 * save/restore cycles multiply soft-edge RGB by alpha again and
 * translucent edges darken progressively. The divide happens in the
 * un-premultiply shader (float precision) before the single U8 quantize;
 * fully transparent pixels are zeroed (canonical straight alpha, and it
 * compresses better) and fully opaque pixels are copied exactly.
 */
export function extractStraightCanvas(renderer: EditorRenderer, texture: Texture): HTMLCanvasElement {
	const { pixels: straight, width: w, height: h } = extractStraightBytes(renderer, texture);
	// Canonical straight alpha: fully transparent pixels are zeroed (also
	// compresses better). The shader already emits these, but belt-and-braces
	// for U8-fallback surfaces read through the same path.
	for (let i = 0; i < straight.length; i += 4) {
		if (straight[i + 3] === 0) {
			straight[i] = 0;
			straight[i + 1] = 0;
			straight[i + 2] = 0;
		}
	}
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d')!;
	ctx.putImageData(new ImageData(Uint8ClampedArray.from(straight), w, h), 0, 0);
	return canvas;
}
