// Layer: render (pixi). Central helper for GPU-resident surface textures.
//
// Goal: `rgba16float` render targets to eliminate 8-bit premultiplied
// quantization on soft brush edges. Every intermediate dab composites in
// half-float precision; the 8-bit quantization happens exactly once at
// encode/read time (via the un-premultiply blit in readback.ts).
//
// `RenderTexture.create` passes all other options through — only `format`
// needs setting here, so all 24 call sites funnel through this helper.
//
// Runtime fallback: WebGL2 float rendering needs EXT_color_buffer_float
// (covered by SwiftShader + all real desktop GL drivers, but not
// guaranteed on every mobile GPU). When unsupported we fall back to Pixi's
// default (bgra8unorm) so the app keeps working with 8-bit surfaces.

import { RenderTexture } from 'pixi.js';

/** Half-float surface format used for all layer/intermediate targets. */
export const SURFACE_FORMAT = 'rgba16float' as const;

/** Bytes per pixel for history accounting (informational only, no caps). */
export const SURFACE_BYTES_PER_PIXEL = 8;

let floatSupport: boolean | null = null;

/**
 * Whether the current GPU can render into rgba16float targets. Probes a
 * throwaway WebGL2 context once and caches the result. Pixi forces WebGL
 * (`preference: 'webgl'` in EditorRenderer), so a WebGL2 test context
 * reflects the runtime renderer.
 */
export function isFloatRenderSupported(): boolean {
	if (floatSupport !== null) return floatSupport;
	try {
		if (typeof document === 'undefined') {
			floatSupport = false;
			return floatSupport;
		}
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
		if (!gl) {
			floatSupport = false;
			return floatSupport;
		}
		// Rendering to half-float requires the color-buffer-float extension
		// (which also covers half-float on WebGL2).
		const ext =
			gl.getExtension('EXT_color_buffer_float') ?? gl.getExtension('EXT_color_buffer_half_float');
		floatSupport = !!ext;
		return floatSupport;
	} catch {
		floatSupport = false;
		return floatSupport;
	}
}

/** Allows probes/tests to override the cached float-support result. */
export function setFloatRenderSupported(value: boolean | null): void {
	floatSupport = value;
}

/**
 * Creates a GPU-resident surface texture: rgba16float when supported,
 * Pixi default (bgra8unorm) otherwise. Width/height are in pixels;
 * resolution is always 1 (surfaces are image-space, not screen-space).
 */
export function createSurfaceTexture(width: number, height: number): RenderTexture {
	const w = Math.max(1, Math.round(width));
	const h = Math.max(1, Math.round(height));
	if (isFloatRenderSupported()) {
		return RenderTexture.create({ width: w, height: h, resolution: 1, format: SURFACE_FORMAT });
	}
	return RenderTexture.create({ width: w, height: h, resolution: 1 });
}

/**
 * Creates a plain 8-bit readback/encode target. Encode paths (PNG, session,
 * clipboard, thumbnails) always go through U8: the float→U8 quantization
 * happens exactly once here, via the un-premultiply shader blit.
 */
export function createU8Texture(width: number, height: number): RenderTexture {
	return RenderTexture.create({ width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)), resolution: 1 });
}
