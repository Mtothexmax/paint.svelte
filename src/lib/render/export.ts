// Layer: render (pixi). Composites a document (without checkerboard) and
// downloads it as a PNG.

import { Container, RenderTexture, Sprite } from 'pixi.js';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { EditorRenderer } from './EditorRenderer';

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
 * downloads the result as a PNG.
 */
export async function exportPng(renderer: EditorRenderer, doc: ImageDocument): Promise<void> {
	const container = new Container();
	for (const layer of doc.layers) {
		if (!layer.visible) continue;
		const tex = renderer.surfaces.getTexture(layer.surfaceId);
		const sprite = new Sprite(tex);
		sprite.alpha = layer.opacity;
		sprite.width = doc.width;
		sprite.height = doc.height;
		container.addChild(sprite);
	}

	const rt = RenderTexture.create({ width: doc.width, height: doc.height, resolution: 1 });
	renderer.app.renderer.render({ container, target: rt, clear: true });

	const probe = new Sprite(rt);
	// resolution: 1 — without it the extraction inherits the renderer's
	// resolution (devicePixelRatio) and the exported PNG comes out larger
	// than the document on scaled displays.
	const canvas = renderer.app.renderer.extract.canvas({ target: probe, resolution: 1 }) as HTMLCanvasElement;

	const blob = await canvasToBlob(canvas);
	probe.destroy();
	rt.destroy(true);
	container.destroy({ children: true });

	const baseName = doc.name.replace(/\.[^.]+$/, '');
	downloadBlob(blob, `${baseName}.png`);
}
