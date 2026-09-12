// Layer: render (pixi). GPU-downsample a document layer to a small thumbnail.
// No backing fill — transparency stays transparent, so the caller's
// checkerboard shows the document's true shape (same as renderLayerThumbnail).

import { Container, Sprite } from 'pixi.js';
import { createU8Texture } from './surfaceTexture';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { EditorRenderer } from './EditorRenderer';
import { extractStraightCanvas } from './readback';

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

	const rt = createU8Texture(cw, ch);

	const holder = new Container();
	const sprite = new Sprite(tex);
	sprite.scale.set(scale, scale);
	holder.addChild(sprite);
	renderer.app.renderer.render({ container: holder, target: rt, clear: true });

	// Straight-alpha encode (see extractStraightCanvas).
	const canvas = extractStraightCanvas(renderer, rt);

	rt.destroy(true);
	holder.destroy({ children: true });
	return canvas;
}

/**
 * Renders a single layer surface scaled to fit within `size` and returns a
 * small detached canvas. No backing fill — transparency stays transparent
 * (the caller shows a checkerboard behind it).
 */
export function renderLayerThumbnail(
	renderer: EditorRenderer,
	doc: ImageDocument,
	surfaceId: string,
	size = 44
): HTMLCanvasElement | null {
	if (!renderer.surfaces.has(surfaceId)) return null;
	const tex = renderer.surfaces.getTexture(surfaceId);
	const scale = Math.min(size / doc.width, size / doc.height, 1) || 1;
	const cw = Math.max(1, Math.round(doc.width * scale));
	const ch = Math.max(1, Math.round(doc.height * scale));

	const rt = createU8Texture(cw, ch);
	const holder = new Container();
	const sprite = new Sprite(tex);
	sprite.scale.set(scale, scale);
	holder.addChild(sprite);
	renderer.app.renderer.render({ container: holder, target: rt, clear: true });

	// Straight-alpha encode (see extractStraightCanvas).
	const canvas = extractStraightCanvas(renderer, rt);

	rt.destroy(true);
	holder.destroy({ children: true });
	return canvas;
}
