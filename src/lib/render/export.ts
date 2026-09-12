// Layer: render (pixi). Composites a document (without checkerboard) and
// downloads it as a PNG.

import { Container, Sprite } from 'pixi.js';
import { createSurfaceTexture, createU8Texture } from './surfaceTexture';
import { SPRITE_BLENDS } from '../render/SurfaceStore';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { EditorRenderer } from './EditorRenderer';
import { extractStraightCanvas } from './readback';

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode image.'))), type);
	});
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Renders the document's layers at 100% into a temporary render target and
 * downloads the result as a PNG. Layers with enabled live effects are
 * composited through their effect chain (same texture the canvas shows).
 */
export async function exportPng(renderer: EditorRenderer, doc: ImageDocument): Promise<void> {
	const container = new Container();
	for (const layer of doc.layers) {
		if (!layer.visible) continue;
		const tex = renderer.exportTextureFor(layer) ?? renderer.surfaces.getTexture(layer.surfaceId);
		const sprite = new Sprite(tex);
		sprite.alpha = layer.opacity;
		sprite.blendMode = SPRITE_BLENDS[layer.blendMode] ?? 'normal';
		sprite.width = doc.width;
		sprite.height = doc.height;
		container.addChild(sprite);
	}

	const rt = createSurfaceTexture(doc.width, doc.height);
	renderer.app.renderer.render({ container, target: rt, clear: true });

	// Straight-alpha encode (see extractStraightCanvas): extract.canvas would
	// bake premultiplied RGB into the PNG, darkening translucent edges.
	const canvas = extractStraightCanvas(renderer, rt);

	const blob = await canvasToBlob(canvas);
	rt.destroy(true);
	container.destroy({ children: true });

	const baseName = doc.name.replace(/\.[^.]+$/, '');
	downloadBlob(blob, `${baseName}.png`);
}

/** Encodes a surface's pixels at 100% into a PNG blob. The surface keeps its
 * alpha (suitable for clipboard copies of selections). */
export async function surfaceToPngBlob(
	renderer: EditorRenderer,
	surfaceId: string,
	w: number,
	h: number
): Promise<Blob> {
	const rt = createSurfaceTexture(w, h);
	const sprite = new Sprite(renderer.surfaces.getTexture(surfaceId));
	const holder = new Container();
	holder.addChild(sprite);
	renderer.app.renderer.render({ container: holder, target: rt, clear: true });

	// Straight-alpha encode (see extractStraightCanvas).
	const canvas = extractStraightCanvas(renderer, rt);
	const blob = await canvasToBlob(canvas);
	sprite.destroy();
	holder.destroy();
	rt.destroy(true);
	return blob;
}

/**
 * Same as `surfaceToPngBlob` but scaled down to fit a `maxSize`×`maxSize` box
 * and returned as a PNG **data URL**, which is what the paste dialog needs for
 * its preview. Downscaling BEFORE the readback keeps the extraction cheap even
 * for a 6000 px screenshot. Returns '' when the canvas is unavailable.
 */
export function surfaceToPngThumbnailUrl(
	renderer: EditorRenderer,
	surfaceId: string,
	w: number,
	h: number,
	maxSize = 180
): string {
	if (w <= 0 || h <= 0) return '';
	const scale = Math.min(1, maxSize / Math.max(w, h));
	const tw = Math.max(1, Math.round(w * scale));
	const th = Math.max(1, Math.round(h * scale));
	const rt = createU8Texture(tw, th);
	const sprite = new Sprite(renderer.surfaces.getTexture(surfaceId));
	sprite.width = tw;
	sprite.height = th;
	const holder = new Container();
	holder.addChild(sprite);
	renderer.app.renderer.render({ container: holder, target: rt, clear: true });

	let url = '';
	try {
		// Straight-alpha encode (see extractStraightCanvas).
		const canvas = extractStraightCanvas(renderer, rt);
		url = canvas.toDataURL('image/png');
	} catch {
		url = '';
	}
	sprite.destroy();
	holder.destroy({ children: true });
	rt.destroy(true);
	return url;
}

/** Writes a surface to the SYSTEM clipboard as PNG (readable by external image
 * editors). Rejects if the Clipboard API or a permission is unavailable. */
export async function writeSurfaceToSystemClipboard(
	renderer: EditorRenderer,
	surfaceId: string,
	w: number,
	h: number
): Promise<void> {
	if (typeof navigator === 'undefined' || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
		throw new Error('Clipboard API not available in this browser.');
	}
	const blob = await surfaceToPngBlob(renderer, surfaceId, w, h);
	await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
