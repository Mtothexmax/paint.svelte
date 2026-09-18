// Layer: render (pixi). Composites a document (without checkerboard) for
// PNG download and system-clipboard copies.

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
	const blob = await documentToPngBlob(renderer, doc);

	const baseName = doc.name.replace(/\.[^.]+$/, '');
	downloadBlob(blob, `${baseName}.png`);
}

/**
 * Composites the whole document exactly like `exportPng` (visible layers at
 * 100%, live effects applied, no checkerboard) and returns the canvas plus
 * its scene graph, so callers that need the pixels (clipboard) can encode
 * them themselves. Pair with `destroyComposite` when done.
 */
export function compositeDocumentToCanvas(
	renderer: EditorRenderer,
	doc: ImageDocument
): { canvas: HTMLCanvasElement; container: Container; rt: ReturnType<typeof createSurfaceTexture> } {
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
	return { canvas, container, rt };
}

/** Releases the scene graph / render target from `compositeDocumentToCanvas`. */
export function destroyComposite(composite: {
	canvas: HTMLCanvasElement;
	container: Container;
	rt: ReturnType<typeof createSurfaceTexture>;
}): void {
	composite.rt.destroy(true);
	composite.container.destroy({ children: true });
}

/** Encodes the whole composited document (exactly what Save As PNG writes)
 * into a PNG blob. */
export async function documentToPngBlob(
	renderer: EditorRenderer,
	doc: ImageDocument
): Promise<Blob> {
	const composite = compositeDocumentToCanvas(renderer, doc);
	try {
		return await canvasToBlob(composite.canvas);
	} finally {
		destroyComposite(composite);
	}
}

/** Writes the whole composited document to the SYSTEM clipboard as PNG
 * (readable by external image editors) — pixel-identical to Save As PNG.
 * Rejects if the Clipboard API or a permission is unavailable. */
export async function writeDocumentToSystemClipboard(
	renderer: EditorRenderer,
	doc: ImageDocument
): Promise<Blob> {
	if (typeof navigator === 'undefined' || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
		throw new Error('Clipboard API not available in this browser.');
	}
	const blob = await documentToPngBlob(renderer, doc);
	await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
	return blob;
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
