// Layer: services. Text layers: committing a draft creates a NEW text layer
// (or re-renders an existing one), keeping the editable TextContent on the
// layer while the surface caches its rasterisation. One undoable step either
// way. Also hosts the text → raster conversion.

import { documentRegistry } from '../core/document/registry';
import { createTextLayer, type TextContent } from '../core/layers/Layer';
import type { RGBA } from '../core/color';
import { getEditorRenderer, hasEditorRenderer } from '../render/EditorRenderer';
import { rasterizeText, blitTextCanvas, type TextCommitOptions } from '../render/text';
import type { TextAlign } from '../state/text';

export interface TextDraftInput {
	x: number;
	y: number;
	text: string;
	family: string;
	size: number;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	strike: boolean;
	align: TextAlign;
	color: RGBA;
}

/**
 * Commits a text draft. With `existingLayerId` pointing at a text layer the
 * layer is re-rendered in place (stays editable); otherwise a new text layer
 * is created on top and activated. Returns false for blank text (or missing
 * doc), true on success.
 */
export function commitTextDraft(input: TextDraftInput, existingLayerId?: string | null): boolean {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return false;
	if (!input.text.trim()) return false;
	const renderer = getEditorRenderer();

	const opts: TextCommitOptions = { ...input };
	const raster = rasterizeText(opts);
	if (!raster) return false;
	const afterId = blitTextCanvas(renderer, doc, raster.canvas, raster.dx, raster.dy);
	if (!afterId) return false;

	const content: TextContent = {
		// The true anchor (pre-bleed): reopening the editor lands exactly
		// where the text was typed; the raster box starts `pad` up-left.
		x: input.x,
		y: input.y,
		width: raster.canvas.width,
		height: raster.canvas.height,
		text: input.text,
		family: input.family,
		size: input.size,
		bold: input.bold,
		italic: input.italic,
		underline: input.underline,
		strike: input.strike,
		align: input.align,
		color: { ...input.color }
	};

	const existing =
		existingLayerId != null ? doc.layers.find((l) => l.id === existingLayerId && l.kind === 'text') : undefined;
	if (existing) {
		const layer = existing;
		const beforeId = layer.surfaceId;
		const beforeText = layer.text ? { ...layer.text, color: { ...layer.text.color } } : undefined;
		layer.surfaceId = afterId;
		layer.text = content;
		renderer.rebuildActiveLayers();
		doc.setDirty(true);
		documentRegistry.notifyChange(doc);
		doc.history.push({
			label: 'Edit Text',
			memoryBytes: doc.width * doc.height * 4 * 2,
			undo: () => {
				if (layer.surfaceId === afterId) {
					layer.surfaceId = beforeId;
					if (beforeText) layer.text = beforeText;
					renderer.rebuildActiveLayers();
				}
			},
			redo: () => {
				if (layer.surfaceId === beforeId) {
					layer.surfaceId = afterId;
					layer.text = { ...content, color: { ...content.color } };
					renderer.rebuildActiveLayers();
				}
			},
			dispose: () => {
				if (layer.surfaceId === afterId) renderer.surfaces.dispose(beforeId);
				else renderer.surfaces.dispose(afterId);
			}
		});
		return true;
	}

	const layer = createTextLayer(afterId, `Text ${doc.layers.length + 1}`, content);
	const index = doc.layers.length;
	doc.insertLayer(layer, index);
	doc.setActiveLayer(layer.id);
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
	doc.history.push({
		label: 'Add Text Layer',
		memoryBytes: doc.width * doc.height * 4,
		undo: () => {
			doc.removeLayer(layer.id);
			if (doc.activeLayerId === layer.id && doc.layers.length) {
				doc.setActiveLayer(doc.layers[doc.layers.length - 1].id);
			}
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.insertLayer(layer, Math.min(index, doc.layers.length));
			doc.setActiveLayer(layer.id);
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {
			if (!doc.layers.includes(layer)) renderer.surfaces.dispose(afterId);
		}
	});
	return true;
}

/** Converts a text layer to a plain raster layer (keeps the pixels). */
export function convertTextToRaster(id: string): void {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return;
	const layer = doc.layers.find((l) => l.id === id);
	if (!layer || layer.kind !== 'text') return;
	const renderer = getEditorRenderer();
	const text = layer.text ? { ...layer.text, color: { ...layer.text.color } } : undefined;

	layer.kind = 'raster';
	layer.text = undefined;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: 'Convert to Raster',
		undo: () => {
			layer.kind = 'text';
			if (text) layer.text = text;
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			layer.kind = 'raster';
			layer.text = undefined;
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {}
	});
}
