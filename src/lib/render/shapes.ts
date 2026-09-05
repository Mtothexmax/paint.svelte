// Layer: render (pixi). Shapes-tool raster commit: draws the dragged shape
// with an offscreen 2D canvas, uploads it as a texture and composites it onto
// a copy of the active layer (surface-swap undo, same pattern as the text
// tool). Outline uses the foreground colour, fill the background colour —
// Paint.NET behaviour. After commit no live shape object remains.

import { CanvasSource, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import type { RGBA } from '../core/color';
import { documentRegistry } from '../core/document/registry';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { EditorRenderer } from './EditorRenderer';
import type { ShapeDrawStyle, ShapeKind, ShapeLineStyle } from '../state/shapes';

export interface ShapeCommitOptions {
	/** Normalized box (top-left + size) in image px. */
	x: number;
	y: number;
	width: number;
	height: number;
	kind: ShapeKind;
	/** Line width in image px. */
	lineWidth: number;
	lineStyle: ShapeLineStyle;
	drawStyle: ShapeDrawStyle;
	outline: RGBA;
	fill: RGBA;
}

export interface Point {
	x: number;
	y: number;
}

/** Polygon vertices for the angular kinds in a x/y/w/h box. */
export function shapePolygonPoints(kind: ShapeKind, x: number, y: number, w: number, h: number): Point[] {
	const cx = x + w / 2;
	const cy = y + h / 2;
	switch (kind) {
		case 'triangle':
			return [
				{ x: cx, y },
				{ x: x + w, y: y + h },
				{ x, y: y + h }
			];
		case 'diamond':
			return [
				{ x: cx, y },
				{ x: x + w, y: cy },
				{ x: cx, y: y + h },
				{ x, y: cy }
			];
		case 'pentagon':
		case 'hexagon': {
			const n = kind === 'pentagon' ? 5 : 6;
			const rx = w / 2;
			const ry = h / 2;
			const pts: Point[] = [];
			for (let i = 0; i < n; i++) {
				const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
				pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
			}
			return pts;
		}
		case 'star': {
			const rx = w / 2;
			const ry = h / 2;
			const pts: Point[] = [];
			for (let i = 0; i < 10; i++) {
				const k = i % 2 === 0 ? 1 : 0.45;
				const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
				pts.push({ x: cx + rx * k * Math.cos(a), y: cy + ry * k * Math.sin(a) });
			}
			return pts;
		}
		default:
			return [];
	}
}

/** Traces the shape path on a 2D context (caller sets styles first). */
function traceShapePath(
	ctx: CanvasRenderingContext2D,
	o: { kind: ShapeKind; x: number; y: number; width: number; height: number }
): void {
	const { x, y, width: w, height: h } = o;
	ctx.beginPath();
	switch (o.kind) {
		case 'rectangle':
			ctx.rect(x, y, w, h);
			break;
		case 'rounded-rect': {
			const r = Math.min(w, h) * 0.25;
			ctx.moveTo(x + r, y);
			ctx.lineTo(x + w - r, y);
			ctx.arcTo(x + w, y, x + w, y + r, r);
			ctx.lineTo(x + w, y + h - r);
			ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
			ctx.lineTo(x + r, y + h);
			ctx.arcTo(x, y + h, x, y + h - r, r);
			ctx.lineTo(x, y + r);
			ctx.arcTo(x, y, x + r, y, r);
			ctx.closePath();
			break;
		}
		case 'ellipse':
			ctx.ellipse(x + w / 2, y + h / 2, Math.max(w / 2, 0.01), Math.max(h / 2, 0.01), 0, 0, Math.PI * 2);
			break;
		default: {
			const pts = shapePolygonPoints(o.kind, x, y, w, h);
			if (!pts.length) return;
			ctx.moveTo(pts[0].x, pts[0].y);
			for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
			ctx.closePath();
		}
	}
}

function cssOf(c: RGBA): string {
	return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a / 255})`;
}

/**
 * Rasterises the shape onto the active layer. Returns false when there was
 * nothing to commit (degenerate box, missing doc/layer).
 */
export function commitShapeToLayer(renderer: EditorRenderer, doc: ImageDocument, o: ShapeCommitOptions): boolean {
	const layerObj = doc.layers.find((l) => l.id === doc.activeLayerId) ?? doc.layers[0];
	if (!layerObj) return false;
	const w = Math.max(1, Math.round(o.width));
	const h = Math.max(1, Math.round(o.height));
	if (w < 1 || h < 1) return false;
	const lineWidth = Math.max(1, Math.round(o.lineWidth));

	// Bleed for the stroke (half width each side, plus dash overhang).
	const pad = Math.ceil(lineWidth / 2) + 2;
	const canvas = document.createElement('canvas');
	canvas.width = w + pad * 2;
	canvas.height = h + pad * 2;
	const ctx = canvas.getContext('2d');
	if (!ctx) return false;

	const box = { kind: o.kind, x: pad, y: pad, width: w, height: h };
	const outlines = o.drawStyle === 'outline' || o.drawStyle === 'fill-outline';
	const fills = o.drawStyle === 'fill' || o.drawStyle === 'fill-outline';
	ctx.lineJoin = 'round';
	ctx.lineCap = o.lineStyle === 'dotted' ? 'round' : 'butt';
	if (o.lineStyle === 'dashed') ctx.setLineDash([lineWidth * 3, lineWidth * 2]);
	else if (o.lineStyle === 'dotted') ctx.setLineDash([0.1, lineWidth * 1.6]);
	if (fills) {
		traceShapePath(ctx, box);
		ctx.fillStyle = cssOf(o.fill);
		ctx.fill();
	}
	if (outlines) {
		traceShapePath(ctx, box);
		ctx.strokeStyle = cssOf(o.outline);
		ctx.lineWidth = lineWidth;
		ctx.stroke();
	}

	const surfaces = renderer.surfaces;
	const afterId = surfaces.copyRegion(layerObj.surfaceId, { x: 0, y: 0, width: doc.width, height: doc.height });

	const source = new CanvasSource({ resource: canvas });
	const tex = new Texture({ source });
	const shapeSprite = new Sprite(tex);
	const dx = Math.round(o.x) - pad;
	const dy = Math.round(o.y) - pad;
	shapeSprite.position.set(dx, dy);

	// Selection clip (same AlphaMask approach as the text tool).
	const maskId = doc.selection.active ? doc.selection.maskId : null;
	let clippedTex: RenderTexture | null = null;
	let comp: Sprite;
	if (maskId && surfaces.has(maskId)) {
		clippedTex = RenderTexture.create({ width: doc.width, height: doc.height, resolution: 1 });
		const holder = new Container();
		const maskSprite = new Sprite(surfaces.getTexture(maskId));
		maskSprite.position.set(0, 0);
		holder.addChild(shapeSprite);
		holder.addChild(maskSprite);
		holder.mask = maskSprite;
		renderer.app.renderer.render({ container: holder, target: clippedTex, clear: true });
		holder.destroy({ children: true });
		comp = new Sprite(clippedTex);
	} else {
		comp = shapeSprite;
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
		label: 'Shape',
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
