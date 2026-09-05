// Layer: render (pixi). Flood-fill building blocks shared by the paint bucket
// (and any future fill tool): a fill-mask builder plus GPU helpers that paint
// a masked colour into a layer copy. The caller owns the surface-swap undo.
//
// The mask is a doc-sized, resolution-1 surface that is solid WHITE where the
// fill lands and transparent elsewhere (same convention as the selection mask
// — Pixi's AlphaMask clips by the RED channel).

import { CanvasSource, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { RGBA } from '../core/color';
import type { SurfaceId } from '../core/layers/Layer';
import type { FloodMode } from '../state/fill';
import type { SurfaceStore } from './SurfaceStore';
import type { EditorRenderer } from './EditorRenderer';

export interface FillSeed {
	/** Seed pixel in image px (floored by the caller). */
	x: number;
	y: number;
	/** Tolerance 0..100 (%): how different a pixel may be and still fill. */
	tolerance: number;
	/** Connected region vs. every matching pixel on the layer. */
	mode: FloodMode;
}

/**
 * Builds the fill mask for a seed by growing over the layer pixels.
 *
 * Why CPU for the region (not a GPU shader): flood-fill region growing is
 * inherently sequential — every pixel depends on its already-visited
 * neighbours — so it cannot be meaningfully parallelized. The GPU still does
 * everything it is good at here: the layer readback source, the mask upload
 * and the final compositing (see paintMaskedColor). The mask itself is a
 * fast scanline fill over a single GPU readback.
 *
 * Readback path: `extract.canvas` + 2D `getImageData` (the same path export
 * and thumbnails use) — straight-alpha bytes, validated before use. An
 * invalid readback returns null instead of a silently empty mask.
 *
 * Comparison: tolerance 0..100% maps to a max per-channel byte difference,
 * applied to R/G/B and alpha alike. Contiguous mode grows 4-connected from
 * the seed; global mode takes every matching pixel.
 */
export function buildFillMaskSurface(
	renderer: EditorRenderer,
	layerId: SurfaceId,
	width: number,
	height: number,
	seed: FillSeed
): SurfaceId | null {
	const surfaces = renderer.surfaces;
	if (!surfaces.has(layerId)) return null;
	const probe = new Sprite(surfaces.getTexture(layerId));
	let canvas: HTMLCanvasElement | null = null;
	try {
		canvas = renderer.app.renderer.extract.canvas({ target: probe, resolution: 1 }) as HTMLCanvasElement;
	} catch (err) {
		console.info('[fill]', `seed=(${seed.x},${seed.y}) readback threw`, err);
	} finally {
		probe.destroy();
	}
	if (!canvas || canvas.width !== width || canvas.height !== height) {
		console.info('[fill]', `seed=(${seed.x},${seed.y}) readback size wrong (got ${canvas?.width}x${canvas?.height})`);
		return null;
	}
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) return null;
	let data: Uint8ClampedArray;
	try {
		data = ctx.getImageData(0, 0, width, height).data;
	} catch (err) {
		console.info('[fill]', `seed=(${seed.x},${seed.y}) getImageData threw`, err);
		return null;
	}
	if (data.length < width * height * 4) {
		console.info('[fill]', `seed=(${seed.x},${seed.y}) pixel buffer short (${data.length})`);
		return null;
	}
	const mask = computeFillMask(data, width, height, seed);
	const up = uploadMaskSurface(surfaces, mask, width, height);
	const s = Math.max(0, Math.min(height - 1, Math.floor(seed.y))) * width + Math.max(0, Math.min(width - 1, Math.floor(seed.x)));
	console.info(
		'[fill]',
		`seed=(${seed.x},${seed.y}) tol=${seed.tolerance} mode=${seed.mode}`,
		`seedColor=(${data[s * 4]},${data[s * 4 + 1]},${data[s * 4 + 2]},${data[s * 4 + 3]}) maskPixels=${up.count}`
	);
	if (up.count === 0) {
		// The seed always matches itself — an empty mask means broken input.
		surfaces.dispose(up.id);
		return null;
	}
	return up.id;
}

/** Scanline flood fill over straight-alpha pixels → 0/255 mask. */
function computeFillMask(
	straight: Uint8ClampedArray,
	width: number,
	height: number,
	seed: FillSeed
): Uint8Array {
	const w = width;
	const h = height;
	const px = Math.max(0, Math.min(w - 1, Math.floor(seed.x)));
	const py = Math.max(0, Math.min(h - 1, Math.floor(seed.y)));
	const maxDiff = (Math.max(0, Math.min(100, seed.tolerance)) / 100) * 255;

	const s = py * w + px;
	const sr = straight[s * 4];
	const sg = straight[s * 4 + 1];
	const sb = straight[s * 4 + 2];
	const sa = straight[s * 4 + 3];
	const match = (i: number): boolean =>
		Math.abs(straight[i] - sr) <= maxDiff &&
		Math.abs(straight[i + 1] - sg) <= maxDiff &&
		Math.abs(straight[i + 2] - sb) <= maxDiff &&
		Math.abs(straight[i + 3] - sa) <= maxDiff;

	const mask = new Uint8Array(w * h);
	if (seed.mode === 'global') {
		for (let i = 0; i < w * h; i++) if (match(i * 4)) mask[i] = 255;
		return mask;
	}
	// Contiguous: iterative span fill (4-connected, no recursion).
	if (!match(s * 4)) return mask;
	const stack: number[] = [s];
	mask[s] = 255;
	while (stack.length) {
		const i = stack.pop()!;
		const x = i % w;
		const y = (i / w) | 0;
		const base = y * w;
		let l = x;
		while (l > 0 && !mask[base + l - 1] && match((base + l - 1) * 4)) {
			mask[base + l - 1] = 255;
			l--;
		}
		let r = x;
		while (r < w - 1 && !mask[base + r + 1] && match((base + r + 1) * 4)) {
			mask[base + r + 1] = 255;
			r++;
		}
		for (let xx = l; xx <= r; xx++) {
			if (y > 0) {
				const j = base - w + xx;
				if (!mask[j] && match(j * 4)) {
					mask[j] = 255;
					stack.push(j);
				}
			}
			if (y < h - 1) {
				const j = base + w + xx;
				if (!mask[j] && match(j * 4)) {
					mask[j] = 255;
					stack.push(j);
				}
			}
		}
	}
	return mask;
}

/** Uploads a 0/255 mask as a white-on-transparent doc-sized surface. */
function uploadMaskSurface(
	surfaces: SurfaceStore,
	mask: Uint8Array,
	width: number,
	height: number
): { id: SurfaceId; count: number } {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d')!;
	const img = ctx.createImageData(width, height);
	const data = img.data;
	let count = 0;
	for (let i = 0; i < mask.length; i++) {
		const o = i * 4;
		data[o] = 255;
		data[o + 1] = 255;
		data[o + 2] = 255;
		data[o + 3] = mask[i];
		if (mask[i]) count++;
	}
	ctx.putImageData(img, 0, 0);
	const source = new CanvasSource({ resource: canvas });
	const tex = new Texture({ source });
	const id = surfaces.create(width, height);
	const sprite = new Sprite(tex);
	surfaces.renderInto(surfaces.getTexture(id), sprite, true);
	sprite.destroy();
	tex.destroy(true);
	return { id, count };
}

/** True when a mask surface has any set pixel (GPU readback). */
export function maskHasContent(
	renderer: EditorRenderer,
	maskId: SurfaceId,
	width: number,
	height: number
): boolean {
	const surfaces = renderer.surfaces;
	if (!surfaces.has(maskId)) return false;
	const probe = new Sprite(surfaces.getTexture(maskId));
	try {
		const extracted = renderer.app.renderer.extract.pixels({ target: probe, resolution: 1 });
		if (!extracted || extracted.width !== width || extracted.height !== height) return false;
		const d = extracted.pixels;
		for (let i = 0; i < d.length; i += 4) if (d[i] > 127) return true;
		return false;
	} catch {
		return false;
	} finally {
		probe.destroy();
	}
}

/**
 * Intersects a fill mask with the selection mask (both doc-sized): the
 * returned surface is set only where BOTH are set. The inputs are untouched;
 * the caller disposes the result.
 */
export function intersectMaskWithSelection(
	surfaces: SurfaceStore,
	maskId: SurfaceId,
	selMaskId: SurfaceId,
	width: number,
	height: number
): SurfaceId {
	const outId = surfaces.create(width, height);
	const holder = new Container();
	const content = new Sprite(surfaces.getTexture(maskId));
	const sel = new Sprite(surfaces.getTexture(selMaskId));
	sel.position.set(0, 0);
	holder.addChild(content);
	holder.addChild(sel);
	holder.mask = sel;
	surfaces.renderInto(surfaces.getTexture(outId), holder, true);
	holder.destroy({ children: true });
	return outId;
}

/**
 * Paints an opaque `color` into `destId` (a doc-sized layer copy) ONLY where
 * `maskId` is set, applying the colour's own alpha on the composite — the
 * same alpha semantics as a brush dab. `maskId`/`destId` are untouched
 * except for the paint; the caller disposes scratch surfaces.
 */
export function paintMaskedColor(
	surfaces: SurfaceStore,
	destId: SurfaceId,
	maskId: SurfaceId,
	color: RGBA,
	width: number,
	height: number
): void {
	const scratchId = surfaces.create(width, height);
	const holder = new Container();
	const shape = new Graphics();
	shape
		.rect(0, 0, width, height)
		.fill((Math.round(color.r) & 0xff) << 16 | ((Math.round(color.g) & 0xff) << 8) | (Math.round(color.b) & 0xff));
	const maskSprite = new Sprite(surfaces.getTexture(maskId));
	maskSprite.position.set(0, 0);
	holder.addChild(shape);
	holder.addChild(maskSprite);
	holder.mask = maskSprite;
	surfaces.renderInto(surfaces.getTexture(scratchId), holder, true);
	holder.destroy({ children: true });
	surfaces.blitRegion(scratchId, destId, 0, 0, 'normal', Math.max(0, Math.min(1, color.a / 255)));
	surfaces.dispose(scratchId);
}
