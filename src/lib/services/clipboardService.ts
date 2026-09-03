// Layer: services. App-level clipboard (internal GPU surface) plus paste-as-
// new-layer. The clipboard is intentionally NOT per document: copy in tab A,
// paste into tab B works. Cut = Copy + one 'Cut' history entry (the erase).

import { documentRegistry } from '../core/document/registry';
import { createRasterLayer, type SurfaceId } from '../core/layers/Layer';
import type { Rect } from '../core/geometry';
import { getEditorRenderer, hasEditorRenderer } from '../render/EditorRenderer';
import { blitMaskedInto } from '../render/selection';
import { deleteSelection } from './selectionService';
import { showNotice } from '../state/ui';

interface ClipboardContent {
	surfaceId: SurfaceId;
	width: number;
	height: number;
}

let content: ClipboardContent | null = null;

/** True when an internal clipboard image is available. */
export function hasClipboardImage(): boolean {
	return !!content;
}

function dropContent(): void {
	if (content && hasEditorRenderer()) {
		getEditorRenderer().surfaces.dispose(content.surfaceId);
	}
	content = null;
}

/**
 * Copies the selected pixels of the active layer into the internal clipboard
 * (the whole layer when nothing is selected). The selection mask is the
 * authority, so composite (add/subtract) and complement selections copy fine.
 */
export function copySelection(): boolean {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return false;
	const layer = doc.activeLayer;
	if (!layer) return false;

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	const w = doc.width;
	const h = doc.height;
	const sel = doc.selection;
	const bounds: Rect = sel.active && sel.bounds ? sel.bounds : { x: 0, y: 0, width: w, height: h };

	let regionId: SurfaceId;
	if (sel.active && sel.maskId && surfaces.has(sel.maskId)) {
		const full = surfaces.create(w, h);
		blitMaskedInto(surfaces, sel.maskId, layer.surfaceId, full, 'normal', w, h);
		regionId = surfaces.copyRegion(full, bounds);
		surfaces.dispose(full);
	} else {
		regionId = surfaces.copyRegion(layer.surfaceId, bounds);
	}

	dropContent();
	content = { surfaceId: regionId, width: bounds.width, height: bounds.height };
	showNotice('Copied.');
	return true;
}

/** Copies the selection, then erases it — recorded as ONE 'Cut' history entry. */
export function cutSelection(): boolean {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return false;
	if (!copySelection()) return false;
	return deleteSelection('Cut');
}

/**
 * Pastes the internal clipboard centred into a NEW layer on the active
 * document, recorded as one 'Paste' history entry.
 */
export function pasteAsNewLayer(): boolean {
	const doc = documentRegistry.active;
	if (!doc) {
		showNotice('No document is open.', 'error');
		return false;
	}
	if (!content) {
		showNotice('Clipboard is empty.', 'error');
		return false;
	}
	if (!hasEditorRenderer()) return false;
	const surfaces = getEditorRenderer().surfaces;
	if (!surfaces.has(content.surfaceId)) {
		content = null;
		showNotice('Clipboard is empty.', 'error');
		return false;
	}

	const srcId = content.surfaceId;
	const surfaceId = surfaces.create(doc.width, doc.height);
	surfaces.blitRegion(
		srcId,
		surfaceId,
		Math.round((doc.width - content.width) / 2),
		Math.round((doc.height - content.height) / 2),
		'normal',
		1
	);
	commitPasteLayer(surfaceId);
	return true;
}

/** Shared tail of both paste paths: wraps `surfaceId` (doc-sized, content
 * already blitted) into a new top layer + history entry. */
function commitPasteLayer(surfaceId: SurfaceId): void {
	const doc = documentRegistry.active!;
	const renderer = getEditorRenderer();
	const layer = createRasterLayer(surfaceId, 'Pasted Layer');
	const index = doc.layers.length;

	doc.insertLayer(layer, index);
	doc.setActiveLayer(layer.id);
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: 'Paste',
		memoryBytes: doc.width * doc.height * 4 * 2,
		undo: () => {
			doc.removeLayer(layer.id);
			const last = doc.layers[doc.layers.length - 1];
			if (last) doc.setActiveLayer(last.id);
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.insertLayer(layer, index);
			doc.setActiveLayer(layer.id);
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {
			if (!doc.layers.includes(layer)) renderer.surfaces.dispose(surfaceId);
		}
	});
}

/**
 * Pastes an OS-clipboard image (already decoded to a bitmap) as a new layer,
 * centred on the active document. Closes the bitmap after upload.
 */
export function pasteBitmapAsLayer(bitmap: ImageBitmap): boolean {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) {
		bitmap.close();
		return false;
	}
	const surfaces = getEditorRenderer().surfaces;
	const srcId = surfaces.createFromBitmap(bitmap);
	bitmap.close();
	const surfaceId = surfaces.create(doc.width, doc.height);
	surfaces.blitRegion(
		srcId,
		surfaceId,
		Math.round((doc.width - bitmap.width) / 2),
		Math.round((doc.height - bitmap.height) / 2),
		'normal',
		1
	);
	surfaces.dispose(srcId);
	commitPasteLayer(surfaceId);
	return true;
}
