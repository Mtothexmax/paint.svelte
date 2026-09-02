// Layer: render (pixi). Raster helpers for the selection MASK surface plus
// pure geometry helpers for the ants outline. The mask is a doc-sized,
// resolution-1 RenderTexture that is transparent outside the selection and
// solid WHITE inside it — Pixi's AlphaMask clips by the texture's RED channel,
// and white (red = 1) inside / transparent (red = 0) outside is exactly what
// the sprite-mask path expects.

import { Container, Graphics, Sprite } from 'pixi.js';
import type { Point, Rect } from '../core/geometry';
import type { SurfaceId } from '../core/layers/Layer';
import type { SelectionKind } from '../core/selection/SelectionModel';
import type { SurfaceStore } from './SurfaceStore';

const WHITE = 0xffffff;

/** Integer-bbox intersection of `r` with the document (floor/ceil semantics so
 * every pixel the shape touches is included), or null when disjoint. */
function intersectDocRect(r: Rect, w: number, h: number): Rect | null {
	const x0 = Math.max(0, Math.floor(r.x));
	const y0 = Math.max(0, Math.floor(r.y));
	const x1 = Math.min(w, Math.ceil(r.x + r.width));
	const y1 = Math.min(h, Math.ceil(r.y + r.height));
	if (x1 <= x0 || y1 <= y0) return null;
	return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Integer bbox of a point set, clamped to the document (or null when empty). */
function pointBounds(pts: Point[], w: number, h: number): Rect | null {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const p of pts) {
		if (p.x < minX) minX = p.x;
		if (p.y < minY) minY = p.y;
		if (p.x > maxX) maxX = p.x;
		if (p.y > maxY) maxY = p.y;
	}
	if (minX > maxX || minY > maxY) return null;
	return intersectDocRect({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, w, h);
}

/** Wipes a mask surface to fully transparent. */
function wipeMask(surfaces: SurfaceStore, maskId: SurfaceId): void {
	surfaces.renderInto(surfaces.getTexture(maskId), new Container(), true);
}

/**
 * Resets the mask surface and fills WHITE over the given shape (rect, ellipse
 * or lasso polygon). Pixels outside the document are never affected (the
 * surface is exactly doc-sized, so the render target clips them) and the
 * returned bounds are the integer bbox clamped to the doc. Returns null when
 * the shape does not touch the document at all.
 */
export function fillShapeMask(
	surfaces: SurfaceStore,
	maskId: SurfaceId,
	docWidth: number,
	docHeight: number,
	kind: SelectionKind,
	rect: Rect | null,
	points: Point[] | null
): Rect | null {
	wipeMask(surfaces, maskId);
	const g = new Graphics();
	let bounds: Rect | null = null;

	if (kind === 'lasso' && points && points.length >= 3) {
		// Freehand polygon — closed by Graphics.poly. A degenerate polygon
		// (all points identical / collinear) fills nothing.
		g.poly(points, true).fill(WHITE);
		bounds = pointBounds(points, docWidth, docHeight);
	} else if (rect && rect.width > 0 && rect.height > 0) {
		if (kind === 'ellipse') {
			// Ellipse inscribed in the (possibly partially off-doc) rect. The
			// doc-sized render target clips anything outside the document.
			const cx = rect.x + rect.width / 2;
			const cy = rect.y + rect.height / 2;
			g.ellipse(cx, cy, Math.abs(rect.width) / 2, Math.abs(rect.height) / 2).fill(WHITE);
			bounds = intersectDocRect(rect, docWidth, docHeight);
		} else {
			// Rectangle: draw only the clipped intersection (exact, minimal).
			const clipped = intersectDocRect(rect, docWidth, docHeight);
			if (!clipped) {
				g.destroy();
				return null;
			}
			g.rect(clipped.x, clipped.y, clipped.width, clipped.height).fill(WHITE);
			bounds = clipped;
		}
	}

	if (!bounds) {
		g.destroy();
		return null;
	}
	surfaces.renderInto(surfaces.getTexture(maskId), g, false);
	g.destroy();
	return bounds;
}

/** Selects the whole document: mask becomes fully white. */
export function maskAll(surfaces: SurfaceStore, maskId: SurfaceId, width: number, height: number): void {
	wipeMask(surfaces, maskId);
	const g = new Graphics();
	g.rect(0, 0, width, height).fill(WHITE);
	surfaces.renderInto(surfaces.getTexture(maskId), g, false);
	g.destroy();
}

/**
 * Returns a NEW mask surface that is the complement of `maskId`'s current
 * content: fill a fresh surface white, then erase the old selection region
 * (destination-out). The caller swaps the model's maskId and disposes the old
 * surface.
 */
export function invertSelectionMask(
	surfaces: SurfaceStore,
	maskId: SurfaceId,
	width: number,
	height: number
): SurfaceId {
	const outId = surfaces.create(width, height);
	surfaces.fill(outId, WHITE);
	surfaces.blitRegion(maskId, outId, 0, 0, 'erase', 1);
	return outId;
}

/**
 * Erases (destination-out) the pixels inside the selection of `destId` (a
 * doc-sized surface). A scratch surface is filled with WHITE only where the
 * selection mask is set (Sprite AlphaMask), then that scratch is blended into
 * `destId` with 'erase' — pixels outside the selection are untouched, pixels
 * inside become fully transparent.
 */
export function eraseSelectionRegion(
	surfaces: SurfaceStore,
	maskId: SurfaceId,
	destId: SurfaceId,
	width: number,
	height: number
): void {
	const scratchId = surfaces.create(width, height);
	const holder = new Container();
	const white = new Graphics();
	white.rect(0, 0, width, height).fill(WHITE);
	const maskSprite = new Sprite(surfaces.getTexture(maskId));
	maskSprite.position.set(0, 0);
	holder.addChild(white);
	holder.addChild(maskSprite);
	holder.mask = maskSprite;
	surfaces.renderInto(surfaces.getTexture(scratchId), holder, true);
	holder.destroy({ children: true });
	surfaces.blitRegion(scratchId, destId, 0, 0, 'erase', 1);
	surfaces.dispose(scratchId);
}

/**
 * Paints a solid, fully-opaque `colorRGB` over `destId` but ONLY inside the
 * selection: a scratch surface is filled with the colour where the mask is set
 * (Sprite AlphaMask), then that scratch is blended into `destId` normally.
 * Pixels outside the selection are untouched. The caller is responsible for the
 * surface-swap undo bookkeeping.
 */
export function fillSelectionRegion(
	surfaces: SurfaceStore,
	maskId: SurfaceId,
	destId: SurfaceId,
	colorRGB: number,
	width: number,
	height: number
): void {
	const scratchId = surfaces.create(width, height);
	const holder = new Container();
	const shape = new Graphics();
	shape.rect(0, 0, width, height).fill(colorRGB);
	const maskSprite = new Sprite(surfaces.getTexture(maskId));
	maskSprite.position.set(0, 0);
	holder.addChild(shape);
	holder.addChild(maskSprite);
	holder.mask = maskSprite;
	surfaces.renderInto(surfaces.getTexture(scratchId), holder, true);
	holder.destroy({ children: true });
	surfaces.blitRegion(scratchId, destId, 0, 0, 'normal', 1);
	surfaces.dispose(scratchId);
}

/**
 * Composites an arbitrary source surface (`srcId`) into `destId` but ONLY where
 * the selection mask is set. The source is copied into a scratch masked by the
 * selection, then blended into the destination with the given blend mode. Used
 * by selection-scoped effects (e.g. Invert Colors inside the selection).
 */
export function blitMaskedInto(
	surfaces: SurfaceStore,
	maskId: SurfaceId,
	srcId: SurfaceId,
	destId: SurfaceId,
	blend: 'normal' | 'erase',
	width: number,
	height: number
): void {
	const scratchId = surfaces.create(width, height);
	const holder = new Container();
	const srcSprite = new Sprite(surfaces.getTexture(srcId));
	const maskSprite = new Sprite(surfaces.getTexture(maskId));
	maskSprite.position.set(0, 0);
	holder.addChild(srcSprite);
	holder.addChild(maskSprite);
	holder.mask = maskSprite;
	surfaces.renderInto(surfaces.getTexture(scratchId), holder, true);
	holder.destroy({ children: true });
	surfaces.blitRegion(scratchId, destId, 0, 0, blend, 1);
	surfaces.dispose(scratchId);
}

/** Closed outline (image px, no duplicated first point) of the current shape,
 * used to draw the ants. Rect → 4 corners, ellipse → sampled points, lasso →
 * the raw polygon points. */
export function selectionOutlinePoints(kind: SelectionKind, rect: Rect | null, points: Point[] | null): Point[] {
	if (kind === 'lasso') return points ? points.map((p) => ({ x: p.x, y: p.y })) : [];
	if (!rect || rect.width <= 0 || rect.height <= 0) return [];
	if (kind === 'ellipse') {
		const cx = rect.x + rect.width / 2;
		const cy = rect.y + rect.height / 2;
		const rx = Math.abs(rect.width) / 2;
		const ry = Math.abs(rect.height) / 2;
		if (rx <= 0 || ry <= 0) return [];
		const SAMPLES = 64;
		const out: Point[] = [];
		for (let i = 0; i < SAMPLES; i++) {
			const t = (i / SAMPLES) * Math.PI * 2;
			out.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
		}
		return out;
	}
	// rect
	return [
		{ x: rect.x, y: rect.y },
		{ x: rect.x + rect.width, y: rect.y },
		{ x: rect.x + rect.width, y: rect.y + rect.height },
		{ x: rect.x, y: rect.y + rect.height }
	];
}
