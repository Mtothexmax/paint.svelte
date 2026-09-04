// Layer: render (pixi). Flood-fill building blocks shared by the paint bucket
// (and any future fill tool): a fill-mask builder plus GPU helpers that paint
// a masked colour into a layer copy. The caller owns the surface-swap undo.
//
// The mask is a doc-sized, resolution-1 surface that is solid WHITE where the
// fill lands and transparent elsewhere (same convention as the selection mask
// — Pixi's AlphaMask clips by the RED channel).

import { Container, Graphics, Sprite } from 'pixi.js';
import type { RGBA } from '../core/color';
import type { SurfaceId } from '../core/layers/Layer';
import type { FloodMode } from '../state/fill';
import type { SurfaceStore } from './SurfaceStore';

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
 * Builds the fill mask for a seed. PLACEHOLDER: fills the whole layer — the
 * real flood fill (tolerance + contiguous/global scope over the layer pixels,
 * honoring `seed`) plugs in here and returns the same white-on-transparent
 * surface. Selection clipping is applied by the caller, not here.
 */
export function buildFillMaskSurface(
	surfaces: SurfaceStore,
	width: number,
	height: number,
	seed: FillSeed
): SurfaceId {
	// Reference the seed so the placeholder signature already carries the
	// real algorithm's inputs (tolerance/mode/seed take effect with it).
	void seed;
	const id = surfaces.create(width, height);
	const g = new Graphics();
	g.rect(0, 0, width, height).fill(0xffffff);
	surfaces.renderInto(surfaces.getTexture(id), g, true);
	g.destroy();
	return id;
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
