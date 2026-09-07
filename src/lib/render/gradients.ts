// Layer: render (pixi). Gradient-fill commit: evaluates a two-stop
// (foreground → background) gradient over the selection bbox — or the whole
// layer when nothing is selected — uploads it as a texture and composites it
// onto a copy of the active layer (surface-swap undo, like the other raster
// tools). Modes: linear, radial, diamond, conical. Repeats: none (clamped),
// wrapped (tiled), mirrored (triangle wave).

import { CanvasSource, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import type { RGBA } from '../core/color';
import { documentRegistry } from '../core/document/registry';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { EditorRenderer } from './EditorRenderer';
import type { GradientMode, GradientRepeat } from '../state/gradients';

export interface GradientCommitOptions {
	/** Gradient line in image px (P0 = foreground end). */
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	mode: GradientMode;
	repeat: GradientRepeat;
	from: RGBA;
	to: RGBA;
}

function applyRepeat(t: number, repeat: GradientRepeat): number {
	if (repeat === 'wrapped') return ((t % 1) + 1) % 1;
	if (repeat === 'mirrored') {
		const m = ((t % 2) + 2) % 2;
		return m <= 1 ? m : 2 - m;
	}
	return Math.max(0, Math.min(1, t));
}

/** Raw (unrepeated) position of pixel (x, y) along the gradient line. */
function rawT(
	mode: GradientMode,
	x: number,
	y: number,
	x0: number,
	y0: number,
	dx: number,
	dy: number,
	lenSq: number,
	len: number,
	ux: number,
	uy: number
): number {
	switch (mode) {
		case 'radial':
			return len > 0 ? Math.hypot(x - x0, y - y0) / len : 0;
		case 'diamond': {
			// Manhattan distance in the line frame, normalized by its length.
			const rx = x - x0;
			const ry = y - y0;
			return len > 0 ? (Math.abs(rx * ux + ry * uy) + Math.abs(-rx * uy + ry * ux)) / len : 0;
		}
		case 'conical': {
			const rx = x - x0;
			const ry = y - y0;
			if (rx === 0 && ry === 0) return 0;
			// Angle of the pixel relative to the line direction, 0..1.
			const cross = (dx * ry - dy * rx) / (len || 1);
			const dot = (dx * rx + dy * ry) / (len || 1);
			let a = Math.atan2(cross, dot);
			if (a < 0) a += Math.PI * 2;
			return a / (Math.PI * 2);
		}
		case 'linear':
		default:
			return lenSq > 0 ? ((x - x0) * dx + (y - y0) * dy) / lenSq : 0;
	}
}

/**
 * Builds the composited gradient surface (layer copy + gradient, selection
 * clipped) WITHOUT touching the document — shared by the live preview and
 * the commit. Returns the new surface (caller-owned) or null.
 */
export function buildGradientSurface(
	renderer: EditorRenderer,
	doc: ImageDocument,
	srcId: string,
	o: GradientCommitOptions
): string | null {
	const dx = o.x1 - o.x0;
	const dy = o.y1 - o.y0;
	const lenSq = dx * dx + dy * dy;
	const len = Math.sqrt(lenSq);
	if (o.mode !== 'conical' && len < 2) return null;

	// Fill the selection bbox (or the whole layer without a selection).
	const sel = doc.selection;
	const useSel = sel.active && !!sel.maskId;
	const bx = useSel && sel.bounds ? Math.max(0, Math.floor(sel.bounds.x)) : 0;
	const by = useSel && sel.bounds ? Math.max(0, Math.floor(sel.bounds.y)) : 0;
	const bw =
		useSel && sel.bounds
			? Math.max(1, Math.min(doc.width - bx, Math.ceil(sel.bounds.width)))
			: doc.width;
	const bh =
		useSel && sel.bounds
			? Math.max(1, Math.min(doc.height - by, Math.ceil(sel.bounds.height)))
			: doc.height;

	const ux = len > 0 ? dx / len : 1;
	const uy = len > 0 ? dy / len : 0;
	const canvas = document.createElement('canvas');
	canvas.width = bw;
	canvas.height = bh;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	const img = ctx.createImageData(bw, bh);
	const data = img.data;
	const fr = Math.round(o.from.r);
	const fg = Math.round(o.from.g);
	const fb = Math.round(o.from.b);
	const fa = Math.round(o.from.a);
	const tr = Math.round(o.to.r);
	const tg = Math.round(o.to.g);
	const tb = Math.round(o.to.b);
	const ta = Math.round(o.to.a);
	for (let j = 0; j < bh; j++) {
		const y = by + j;
		for (let i = 0; i < bw; i++) {
			const x = bx + i;
			const t = applyRepeat(rawT(o.mode, x, y, o.x0, o.y0, dx, dy, lenSq, len, ux, uy), o.repeat);
			const k = Math.max(0, Math.min(1, t));
			const off = (j * bw + i) * 4;
			data[off] = Math.round(fr + (tr - fr) * k);
			data[off + 1] = Math.round(fg + (tg - fg) * k);
			data[off + 2] = Math.round(fb + (tb - fb) * k);
			data[off + 3] = Math.round(fa + (ta - fa) * k);
		}
	}
	ctx.putImageData(img, 0, 0);

	const surfaces = renderer.surfaces;
	const afterId = surfaces.copyRegion(srcId, { x: 0, y: 0, width: doc.width, height: doc.height });

	const source = new CanvasSource({ resource: canvas });
	const tex = new Texture({ source });
	const gradSprite = new Sprite(tex);
	gradSprite.position.set(bx, by);

	// Clip to the selection mask when one is active.
	const maskId = useSel ? sel.maskId : null;
	let clippedTex: RenderTexture | null = null;
	let comp: Sprite;
	if (maskId && surfaces.has(maskId)) {
		clippedTex = RenderTexture.create({ width: doc.width, height: doc.height, resolution: 1 });
		const holder = new Container();
		const maskSprite = new Sprite(surfaces.getTexture(maskId));
		maskSprite.position.set(0, 0);
		holder.addChild(gradSprite);
		holder.addChild(maskSprite);
		holder.mask = maskSprite;
		renderer.app.renderer.render({ container: holder, target: clippedTex, clear: true });
		holder.destroy({ children: true });
		comp = new Sprite(clippedTex);
	} else {
		comp = gradSprite;
	}
	comp.blendMode = 'normal';
	comp.alpha = 1;
	const blendHolder = new Container();
	blendHolder.addChild(comp);
	surfaces.renderInto(surfaces.getTexture(afterId), blendHolder, false);
	blendHolder.destroy({ children: true });
	tex.destroy(true);
	if (clippedTex) clippedTex.destroy(true);
	return afterId;
}

/**
 * Commits the gradient onto the active layer. Returns false when there was
 * nothing to commit (degenerate line for the line-based modes, missing
 * doc/layer).
 */
export function commitGradientToLayer(
	renderer: EditorRenderer,
	doc: ImageDocument,
	o: GradientCommitOptions
): boolean {
	const layerObj = doc.layers.find((l) => l.id === doc.activeLayerId) ?? doc.layers[0];
	if (!layerObj) return false;
	const afterId = buildGradientSurface(renderer, doc, layerObj.surfaceId, o);
	if (!afterId) return false;

	const beforeId = layerObj.surfaceId;
	layerObj.surfaceId = afterId;
	renderer.rebuildActiveLayers();

	doc.history.push({
		label: 'Gradient',
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
