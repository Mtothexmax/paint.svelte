// Layer: render (pixi). Text rasterisation: draws a draft with an offscreen
// 2D canvas and uploads it. Text LAYERS own their raster cache surface (kept
// editable via the stored TextContent); services own the surface-swap undo.

import { CanvasSource, Container, RenderTexture, Sprite, Texture } from 'pixi.js';
import type { RGBA } from '../core/color';
import type { SurfaceId } from '../core/layers/Layer';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { EditorRenderer } from './EditorRenderer';
import type { TextAlign } from '../state/text';

export interface TextCommitOptions {
	/** Image-space anchor (top-left of the text box) in image px. */
	x: number;
	y: number;
	text: string;
	family: string;
	size: number; // px at 100% zoom
	bold: boolean;
	italic: boolean;
	underline: boolean;
	strike: boolean;
	align: TextAlign;
	color: RGBA;
}

function fontOf(o: TextCommitOptions): string {
	const style = o.italic ? 'italic ' : '';
	const weight = o.bold ? 'bold ' : '';
	return `${style}${weight}${Math.max(8, Math.round(o.size))}px "${o.family}", sans-serif`;
}

// --- HTML baseline calibration --------------------------------------------
// The overlay editor is HTML text (line-height 1, no padding). Its baseline
// offset depends on the browser's font metrics, which the canvas API does not
// expose (fontBoundingBoxAscent is the max ink extent — larger than the
// baseline offset, which is why commits used to land too low). So we measure
// the real thing: a hidden mirror with identical font properties plus a
// zero-size inline-block probe whose bottom edge sits exactly on the baseline.

const baselineCache = new Map<string, number>();

function measureHtmlBaseline(o: TextCommitOptions): number {
	const size = Math.max(8, Math.round(o.size));
	const key = `${o.family}|${size}|${o.bold ? 'b' : ''}${o.italic ? 'i' : ''}`;
	const cached = baselineCache.get(key);
	if (cached !== undefined) return cached;
	let baseline = size * 0.8;
	try {
		const div = document.createElement('div');
		div.setAttribute('aria-hidden', 'true');
		div.style.cssText =
			'position:fixed;visibility:hidden;top:0;left:0;padding:0;margin:0;border:none;' +
			`font-family:"${o.family}",sans-serif;font-size:${size}px;line-height:1;` +
			`font-weight:${o.bold ? 'bold' : 'normal'};font-style:${o.italic ? 'italic' : 'normal'};`;
		div.textContent = 'Ag';
		const probe = document.createElement('span');
		probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;';
		div.appendChild(probe);
		document.body.appendChild(div);
		const top = div.getBoundingClientRect().top;
		const probeBottom = probe.getBoundingClientRect().bottom;
		if (Number.isFinite(probeBottom - top) && probeBottom - top > 0) baseline = probeBottom - top;
		div.remove();
	} catch {
		/* keep fallback */
	}
	if (baselineCache.size > 50) baselineCache.clear();
	baselineCache.set(key, baseline);
	return baseline;
}

/**
 * Rasterises the draft to an (unpadded-position, canvas) pair. Returns null
 * for blank text. The canvas origin maps to image (`x`, `y`).
 */
export function rasterizeText(o: TextCommitOptions): { canvas: HTMLCanvasElement; dx: number; dy: number } | null {
	const lines = o.text.split('\n');
	if (!lines.some((l) => l.trim().length > 0)) return null;

	const size = Math.max(8, Math.round(o.size));
	const measure = document.createElement('canvas').getContext('2d');
	if (!measure) return null;
	measure.font = fontOf(o);
	let boxW = 1;
	for (const line of lines) boxW = Math.max(boxW, Math.ceil(measure.measureText(line || ' ').width));
	// Same geometry as the overlay editor (line-height 1, no padding): every
	// line is `size` px tall and drawn from the browser-measured alphabetic
	// baseline, so the committed glyphs sit exactly where the preview was.
	const lineH = size;
	const htmlBaseline = measureHtmlBaseline(o);
	const pad = Math.ceil(size * 0.5);
	const canvas = document.createElement('canvas');
	canvas.width = boxW + pad * 2;
	canvas.height = lines.length * lineH + pad * 2;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	ctx.font = fontOf(o);
	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = `rgba(${o.color.r}, ${o.color.g}, ${o.color.b}, ${o.color.a / 255})`;
	const decoWidth = Math.max(1, size / 14);
	ctx.lineWidth = decoWidth;
	ctx.strokeStyle = ctx.fillStyle;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const w = measure.measureText(line || ' ').width;
		let lx = pad;
		if (o.align === 'center') lx = pad + (boxW - w) / 2;
		else if (o.align === 'right') lx = pad + (boxW - w);
		const baseline = pad + i * lineH + htmlBaseline;
		ctx.fillText(line, lx, baseline);
		if (o.underline) {
			const uy = baseline + Math.max(2, Math.round(size * 0.12));
			ctx.beginPath();
			ctx.moveTo(lx, uy);
			ctx.lineTo(lx + w, uy);
			ctx.stroke();
		}
		if (o.strike) {
			const sy = baseline - Math.round(size * 0.28);
			ctx.beginPath();
			ctx.moveTo(lx, sy);
			ctx.lineTo(lx + w, sy);
			ctx.stroke();
		}
	}
	// The overlay is inset-free now (outline instead of border, no padding),
	// so the raster box origin is just the anchor minus the bleed pad.
	return { canvas, dx: Math.round(o.x - pad), dy: Math.round(o.y - pad) };
}

/**
 * Blits a rasterised text canvas into a FRESH doc-sized transparent surface
 * (clipped by the active selection, same AlphaMask approach as the paint
 * engines). Returns the new surface (caller-owned) or null.
 */
export function blitTextCanvas(
	renderer: EditorRenderer,
	doc: ImageDocument,
	canvas: HTMLCanvasElement,
	dx: number,
	dy: number
): SurfaceId | null {
	const surfaces = renderer.surfaces;
	const id = surfaces.create(doc.width, doc.height);
	const source = new CanvasSource({ resource: canvas });
	const tex = new Texture({ source });
	const textSprite = new Sprite(tex);
	textSprite.position.set(dx, dy);

	const maskId = doc.selection.active ? doc.selection.maskId : null;
	let clippedTex: RenderTexture | null = null;
	let comp: Sprite;
	if (maskId && surfaces.has(maskId)) {
		clippedTex = RenderTexture.create({ width: doc.width, height: doc.height, resolution: 1 });
		const holder = new Container();
		const maskSprite = new Sprite(surfaces.getTexture(maskId));
		maskSprite.position.set(0, 0);
		holder.addChild(textSprite);
		holder.addChild(maskSprite);
		holder.mask = maskSprite;
		renderer.app.renderer.render({ container: holder, target: clippedTex, clear: true });
		holder.destroy({ children: true });
		comp = new Sprite(clippedTex);
	} else {
		comp = textSprite;
	}
	comp.blendMode = 'normal';
	comp.alpha = 1;
	const blendHolder = new Container();
	blendHolder.addChild(comp);
	surfaces.renderInto(surfaces.getTexture(id), blendHolder, false);
	// blendHolder owns `comp` (children:true destroys the sprite, not its
	// texture). `tex` owns the uploaded canvas pixels — destroy it once.
	blendHolder.destroy({ children: true });
	tex.destroy(true);
	if (clippedTex) clippedTex.destroy(true);
	return id;
}
