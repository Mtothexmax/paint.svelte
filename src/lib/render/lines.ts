// Layer: render (pixi). Line/curve-tool raster commit: strokes a cubic
// Bézier (start/end + two control nubs) with an offscreen 2D canvas, uploads
// it as a texture and composites it onto a copy of the active layer
// (surface-swap undo, same pattern as the shapes tool). Optional arrow heads
// orient along the end tangents. After commit no live object remains.

import { CanvasSource, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import type { RGBA } from '../core/color';
import { documentRegistry } from '../core/document/registry';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { EditorRenderer } from './EditorRenderer';
import type { ShapeLineStyle } from '../state/shapes';
import type { LineArrow } from '../state/lines';

export interface Vec {
	x: number;
	y: number;
}

export interface LineCommitOptions {
	/** Cubic Bézier control points (image px): start, ctrl1, ctrl2, end. */
	p0: Vec;
	p1: Vec;
	p2: Vec;
	p3: Vec;
	/** Line width in image px. */
	lineWidth: number;
	lineStyle: ShapeLineStyle;
	arrow: LineArrow;
	color: RGBA;
}

/** Point on the cubic Bézier at t (shared by raster + SVG preview). */
export function cubicPoint(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
	const u = 1 - t;
	return {
		x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
		y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
	};
}

/** Unit tangent of the curve at t (zero vector when degenerate). */
function cubicTangent(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
	const u = 1 - t;
	const dx =
		3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
	const dy =
		3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
	const len = Math.hypot(dx, dy);
	return len > 1e-6 ? { x: dx / len, y: dy / len } : { x: 0, y: 0 };
}

/**
 * Arrow-head length for a line width (shared by the SVG preview and the
 * raster commit so both always agree).
 */
export function arrowHeadLength(lineWidth: number): number {
	return Math.max(3, Math.round(lineWidth * 2.5));
}

/**
 * Filled arrow-head triangle (tip + two base corners) for an endpoint,
 * oriented along the curve tangent. `size` is the head length in the same
 * units as the points. Returns null for degenerate tangents.
 */
export function arrowHeadPoints(
	p0: Vec,
	p1: Vec,
	p2: Vec,
	p3: Vec,
	atStart: boolean,
	size: number
): [Vec, Vec, Vec] | null {
	const t = atStart ? 0 : 1;
	let dir = cubicTangent(p0, p1, p2, p3, t);
	if (atStart) dir = { x: -dir.x, y: -dir.y };
	if (dir.x === 0 && dir.y === 0) return null;
	const tip = atStart ? p0 : p3;
	const bx = tip.x - dir.x * size;
	const by = tip.y - dir.y * size;
	const w = size * 0.42;
	return [
		tip,
		{ x: bx - dir.y * w, y: by + dir.x * w },
		{ x: bx + dir.y * w, y: by - dir.x * w }
	];
}

function cssOf(c: RGBA): string {
	return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a / 255})`;
}

/**
 * Rasterises the curve onto the active layer. Returns false when there was
 * nothing to commit (degenerate curve, missing doc/layer).
 */
export function commitLineToLayer(renderer: EditorRenderer, doc: ImageDocument, o: LineCommitOptions): boolean {
	const layerObj = doc.layers.find((l) => l.id === doc.activeLayerId) ?? doc.layers[0];
	if (!layerObj) return false;
	const lineWidth = Math.max(1, Math.round(o.lineWidth));
	// Curve length check — a click without drag commits nothing.
	let approxLen = 0;
	let prev = o.p0;
	for (let i = 1; i <= 16; i++) {
		const p = cubicPoint(o.p0, o.p1, o.p2, o.p3, i / 16);
		approxLen += Math.hypot(p.x - prev.x, p.y - prev.y);
		prev = p;
	}
	if (approxLen < 2) return false;

	const xs = [o.p0.x, o.p1.x, o.p2.x, o.p3.x];
	const ys = [o.p0.y, o.p1.y, o.p2.y, o.p3.y];
	const minX = Math.min(...xs);
	const minY = Math.min(...ys);
	const maxX = Math.max(...xs);
	const maxY = Math.max(...ys);
	// Bleed for the stroke width + arrow heads.
	const pad = Math.ceil(lineWidth / 2) + Math.ceil(lineWidth * 3.5) + 2;
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, Math.ceil(maxX - minX) + pad * 2);
	canvas.height = Math.max(1, Math.ceil(maxY - minY) + pad * 2);
	const ctx = canvas.getContext('2d');
	if (!ctx) return false;

	const shift = (p: Vec): Vec => ({ x: p.x - minX + pad, y: p.y - minY + pad });
	const q0 = shift(o.p0);
	const q1 = shift(o.p1);
	const q2 = shift(o.p2);
	const q3 = shift(o.p3);
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.lineWidth = lineWidth;
	if (o.lineStyle === 'dashed') ctx.setLineDash([lineWidth * 3, lineWidth * 2]);
	else if (o.lineStyle === 'dotted') ctx.setLineDash([0.1, lineWidth * 1.6]);
	ctx.strokeStyle = cssOf(o.color);
	ctx.beginPath();
	ctx.moveTo(q0.x, q0.y);
	ctx.bezierCurveTo(q1.x, q1.y, q2.x, q2.y, q3.x, q3.y);
	ctx.stroke();

	// Solid arrow heads over the stroke ends.
	const headLen = arrowHeadLength(lineWidth);
	const heads: Array<[Vec, Vec, Vec] | null> = [];
	if (o.arrow === 'start' || o.arrow === 'both') heads.push(arrowHeadPoints(q0, q1, q2, q3, true, headLen));
	if (o.arrow === 'end' || o.arrow === 'both') heads.push(arrowHeadPoints(q0, q1, q2, q3, false, headLen));
	ctx.fillStyle = cssOf(o.color);
	for (const tri of heads) {
		if (!tri) continue;
		ctx.beginPath();
		ctx.moveTo(tri[0].x, tri[0].y);
		ctx.lineTo(tri[1].x, tri[1].y);
		ctx.lineTo(tri[2].x, tri[2].y);
		ctx.closePath();
		ctx.fill();
	}

	const surfaces = renderer.surfaces;
	const afterId = surfaces.copyRegion(layerObj.surfaceId, { x: 0, y: 0, width: doc.width, height: doc.height });

	const source = new CanvasSource({ resource: canvas });
	const tex = new Texture({ source });
	const lineSprite = new Sprite(tex);
	lineSprite.position.set(minX - pad, minY - pad);

	// Selection clip (same AlphaMask approach as the shapes tool).
	const maskId = doc.selection.active ? doc.selection.maskId : null;
	let clippedTex: RenderTexture | null = null;
	let comp: Sprite;
	if (maskId && surfaces.has(maskId)) {
		clippedTex = RenderTexture.create({ width: doc.width, height: doc.height, resolution: 1 });
		const holder = new Container();
		const maskSprite = new Sprite(surfaces.getTexture(maskId));
		maskSprite.position.set(0, 0);
		holder.addChild(lineSprite);
		holder.addChild(maskSprite);
		holder.mask = maskSprite;
		renderer.app.renderer.render({ container: holder, target: clippedTex, clear: true });
		holder.destroy({ children: true });
		comp = new Sprite(clippedTex);
	} else {
		comp = lineSprite;
	}
	comp.blendMode = 'normal';
	comp.alpha = 1;
	const blendHolder = new Container();
	blendHolder.addChild(comp);
	surfaces.renderInto(surfaces.getTexture(afterId), blendHolder, false);
	blendHolder.destroy({ children: true });
	tex.destroy(true);
	if (clippedTex) clippedTex.destroy(true);

	const beforeId = layerObj.surfaceId;
	layerObj.surfaceId = afterId;
	renderer.rebuildActiveLayers();

	doc.history.push({
		label: 'Line',
		memoryBytes: doc.width * doc.height * 4 * 2,
		undo: () => {
			if (layerObj.surfaceId === afterId) {
				layerObj.surfaceId = beforeId;
				renderer.rebuildActiveLayers();
			}
		},
		redo: () => {
			if (layerObj.surfaceId === beforeId) {
				layerObj.surfaceId = afterId;
				renderer.rebuildActiveLayers();
			}
		},
		dispose: () => {}
	});
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
	return true;
}
