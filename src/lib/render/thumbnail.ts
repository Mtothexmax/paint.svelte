// Layer: render (pixi). GPU-downsample a document layer to a small thumbnail.
// The doc area is backed with a neutral fill so an empty/transparent document
// still shows its true aspect (not just a square transparent tab).

import { Container, Graphics, RenderTexture, Sprite } from 'pixi.js';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { EditorRenderer } from './EditorRenderer';

/**
 * Renders the (bottom-most visible) layer scaled to fit within `size` and
 * returns a small detached canvas. Only a tiny region is read back.
 */
export function renderThumbnail(
	renderer: EditorRenderer,
	doc: ImageDocument,
	size = 40
): HTMLCanvasElement | null {
	const layer = doc.layers[0];
	if (!layer) return null;
	const tex = renderer.surfaces.getTexture(layer.surfaceId);
	const scale = Math.min(size / doc.width, size / doc.height, 1) || 1;
	const cw = Math.max(1, Math.round(doc.width * scale));
	const ch = Math.max(1, Math.round(doc.height * scale));

	const rt = RenderTexture.create({ width: cw, height: ch, resolution: 1 });

	// Neutral backing so a transparent doc still shows its area shape/aspect.
	const bg = new Graphics();
	bg.rect(0, 0, cw, ch).fill(0xcccccc);
	renderer.app.renderer.render({ container: bg, target: rt, clear: true });

	const holder = new Container();
	const sprite = new Sprite(tex);
	sprite.scale.set(scale, scale);
	holder.addChild(sprite);
	renderer.app.renderer.render({ container: holder, target: rt, clear: false });

	const probe = new Sprite(rt);
	const canvas = renderer.app.renderer.extract.canvas(probe) as HTMLCanvasElement;

	probe.destroy();
	rt.destroy(true);
	bg.destroy();
	holder.destroy({ children: true });
	return canvas;
}
