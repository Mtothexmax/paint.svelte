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

/** Appends the geometry of the positive selection shape to a Graphics path.
 * Rect/ellipse draw from their bounding rect; lasso draws the closed polygon. */
function addShapePath(g: Graphics, kind: SelectionKind, rect: Rect | null, points: Point[] | null): boolean {
	if (kind === 'lasso') {
		if (points && points.length >= 3) {
			g.poly(points, true);
			return true;
		}
		return false;
	}
	if (!rect || rect.width <= 0 || rect.height <= 0) return false;
	if (kind === 'ellipse') {
		g.ellipse(rect.x + rect.width / 2, rect.y + rect.height / 2, Math.abs(rect.width) / 2, Math.abs(rect.height) / 2);
	} else {
		g.rect(rect.x, rect.y, rect.width, rect.height);
	}
	return true;
}

/**
 * Writes the complement of the POSITIVE selection shape (`kind`/`rect`/`points`)
 * into the (already-doc-sized) `maskId` surface: a full-document white rectangle
 * is filled and the shape is then subtracted as a real GEOMETRIC hole via Pixi's
 * `Graphics.cut()` (outer shape filled first, then the inner shape is cut out).
 * This is the framework-native way to make a hole and produces a clean,
 * consistent mask (no premultiplied residue). The result: everything EXCEPT the
 * shape is selected — exactly a donut/complement selection.
 */
export function invertSelectionMask(
	surfaces: SurfaceStore,
	maskId: SurfaceId,
	width: number,
	height: number,
	kind: SelectionKind,
	rect: Rect | null,
	points: Point[] | null
): void {
	wipeMask(surfaces, maskId);
	const g = new Graphics();
	// 1) fill the whole document white
	g.rect(0, 0, width, height).fill(WHITE);
	// 2) draw the inner (hole) path and cut it out of the filled rectangle
	if (addShapePath(g, kind, rect, points)) g.cut();
	surfaces.renderInto(surfaces.getTexture(maskId), g, false);
	g.destroy();
}

/**
 * Erases (destination-out) the pixels inside the selection of `destId` (a
 * doc-sized surface). The selection MASK itself is used as the erase source, so
 * holes are respected exactly (e.g. a donut/complement selection only clears
 * its ring, never the hole). Premultiplied masking through an intermediate
 * scratch is unnecessary — dest-out already keys off the mask's alpha.
 */
export function eraseSelectionRegion(
	surfaces: SurfaceStore,
	maskId: SurfaceId,
	destId: SurfaceId,
	width: number,
	height: number
): void {
	// width/height are informational (the surfaces are doc-sized).
	void width;
	void height;
	surfaces.blitRegion(maskId, destId, 0, 0, 'erase', 1);
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

/** Renders the white selection shape onto an existing mask surface (no wipe) — used to ADD a shape. */
function addShapeToMask(surfaces: SurfaceStore, destId: SurfaceId, kind: SelectionKind, rect: Rect | null, points: Point[] | null): void {
	const g = new Graphics();
	if (addShapePath(g, kind, rect, points)) {
		g.fill(WHITE);
		surfaces.renderInto(surfaces.getTexture(destId), g, false);
	}
	g.destroy();
}

/** Returns a NEW surface = current selection ∪ shape (union). */
export function unionSelection(
	surfaces: SurfaceStore,
	currentMaskId: SurfaceId,
	width: number,
	height: number,
	kind: SelectionKind,
	rect: Rect | null,
	points: Point[] | null
): SurfaceId {
	// complement of the shape (white = everything except the shape)
	const compShape = surfaces.create(width, height);
	invertSelectionMask(surfaces, compShape, width, height, kind, rect, points);
	// keep only the current content that lies OUTSIDE the shape …
	const out = surfaces.create(width, height);
	blitMaskedInto(surfaces, compShape, currentMaskId, out, 'normal', width, height);
	surfaces.dispose(compShape);
	// … then add the shape back → current ∪ shape.
	addShapeToMask(surfaces, out, kind, rect, points);
	return out;
}

/** Returns a NEW surface = current selection − shape (difference). */
export function subtractSelection(
	surfaces: SurfaceStore,
	currentMaskId: SurfaceId,
	width: number,
	height: number,
	kind: SelectionKind,
	rect: Rect | null,
	points: Point[] | null
): SurfaceId {
	const compShape = surfaces.create(width, height);
	invertSelectionMask(surfaces, compShape, width, height, kind, rect, points);
	const out = surfaces.create(width, height);
	blitMaskedInto(surfaces, compShape, currentMaskId, out, 'normal', width, height);
	surfaces.dispose(compShape);
	return out;
}

/**
 * Traces the closed outline loops of a selection from its mask's alpha channel
 * (RGBA data, one pixel per 4 bytes). The mask region can be any composite of
 * add/subtract shapes, so we walk the axis-aligned pixel boundary between
 * inside and outside pixels, chain the unit segments into closed loops and
 * merge collinear runs. Returns loops in image-pixel coordinates (the shared
 * ant outline used when the selection has no single geometric shape).
 */
export function traceSelectionOutline(rgba: Uint8ClampedArray, width: number, height: number): Point[][] {
	const W = width;
	const H = height;
	// boundary segments live on integer grid lines between an inside and an
	// outside cell. Each segment is stored under both endpoint keys for chaining.
	type Seg = { x1: number; y1: number; x2: number; y2: number };
	const segs: Seg[] = [];
	const isIn = (x: number, y: number): boolean => {
		if (x < 0 || y < 0 || x >= W || y >= H) return false;
		return rgba[(y * W + x) * 4 + 3] > 80;
	};
	// For every inside cell, the unit edge to each outside neighbour.
	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			if (!isIn(x, y)) continue;
			if (!isIn(x, y - 1)) segs.push({ x1: x, y1: y, x2: x + 1, y2: y }); // top
			if (!isIn(x + 1, y)) segs.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1 }); // right
			if (!isIn(x, y + 1)) segs.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1 }); // bottom
			if (!isIn(x - 1, y)) segs.push({ x1: x, y1: y, x2: x, y2: y + 1 }); // left
		}
	}
	if (!segs.length) return [];

	// adjacency from endpoint key -> list of segment ids
	const key = (x: number, y: number) => `${x},${y}`;
	const adj = new Map<string, number[]>();
	const addAdj = (k: string, i: number) => {
		const list = adj.get(k);
		if (list) list.push(i);
		else adj.set(k, [i]);
	};
	segs.forEach((s, i) => {
		addAdj(key(s.x1, s.y1), i);
		addAdj(key(s.x2, s.y2), i);
	});
	const used = new Array<boolean>(segs.length).fill(false);
	const loops: Point[][] = [];

	for (let start = 0; start < segs.length; start++) {
		if (used[start]) continue;
		// walk a loop from segs[start]
		let cur = start;
		const pts: Point[] = [];
		const seenInLoop = new Set<number>();
		let guard = 0;
		while (!used[cur] && !seenInLoop.has(cur) && guard++ < segs.length * 2) {
			used[cur] = true;
			seenInLoop.add(cur);
			const s = segs[cur];
			pts.push({ x: s.x1, y: s.y1 });
			// choose the other endpoint to continue from
			let nextX = s.x2;
			let nextY = s.y2;
			const candidates = adj.get(key(nextX, nextY)) ?? [];
			const next = candidates.find((i) => i !== cur && !used[i] && !seenInLoop.has(i));
			if (next === undefined) break;
			cur = next;
		}
		if (pts.length > 2) {
			// close the loop back to the first point
			pts.push({ x: pts[0].x, y: pts[0].y });
			loops.push(mergeCollinear(pts));
		}
	}
	return loops;
}

/** Removes colinear points from an orthogonal polyline loop. */
function mergeCollinear(pts: Point[]): Point[] {
	if (pts.length < 3) return pts;
	const out: Point[] = [];
	for (let i = 0; i < pts.length; i++) {
		const prev = pts[(i - 1 + pts.length) % pts.length];
		const cur = pts[i];
		const next = pts[(i + 1) % pts.length];
		const dx1 = cur.x - prev.x;
		const dy1 = cur.y - prev.y;
		const dx2 = next.x - cur.x;
		const dy2 = next.y - cur.y;
		const colinear = dx1 * dy2 === dy1 * dx2; // parallel
		if (!colinear) out.push(cur);
	}
	return out;
}
