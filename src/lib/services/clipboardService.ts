// Layer: services. App-level clipboard (internal GPU surface) plus paste-as-
// new-layer. The clipboard is intentionally NOT per document: copy in tab A,
// paste into tab B works. Cut = Copy + one 'Cut' history entry (the erase).

import { documentRegistry } from '../core/document/registry';
import { createRasterLayer, type SurfaceId } from '../core/layers/Layer';
import type { Rect } from '../core/geometry';
import { getEditorRenderer, hasEditorRenderer } from '../render/EditorRenderer';
import { blitMaskedInto } from '../render/selection';
import { surfaceToPngThumbnailUrl, writeSurfaceToSystemClipboard, documentToPngBlob } from '../render/export';
import { resizeCanvas } from '../render/resize';
import { openDialog, type PasteDialogPayload, type PasteOversizeChoice } from './dialogService';
import { deleteSelection } from './selectionService';
import { showNotice } from '../state/ui';
import { cancelFloatingMove } from '../state/moveTransform';

interface ClipboardContent {
	surfaceId: SurfaceId;
	width: number;
	height: number;
}

let content: ClipboardContent | null = null;

/**
 * True once a copy has successfully mirrored its pixels onto the SYSTEM
 * clipboard. When that is the case Ctrl+V is left to the browser, so whatever
 * is really on the OS clipboard (a Paint.NET selection, a screenshot, …) wins
 * over our internal copy.
 */
let onSystemClipboard = false;

/** True when the last copy reached the system clipboard, so the browser's own
 * paste event can be trusted to deliver the image. */
export function systemClipboardHasImage(): boolean {
	return onSystemClipboard;
}

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

// --- pasting foreign images (DIB tolerance) -------------------------------
// Clipboard managers like Ditto serve CF_DIB: BMP pixels WITHOUT the 14-byte
// file header (which native apps like Paint.NET read directly). Browsers may
// expose those bytes as image/bmp — or with no usable MIME type at all — and
// the image decoder then chokes on the missing header. Sniffing for a bare
// DIB and wrapping it in a file header makes those pastes work.

/** BITMAPINFOHEADER sizes (v3 + v4 + v5) a bare DIB can start with. */
const DIB_HEADER_SIZES = new Set([40, 52, 56, 108, 124]);

/** True when bytes look like a bare CF_DIB rather than a BMP file ('BM'). */
function isBareDib(bytes: Uint8Array): boolean {
	if (bytes.length < 4) return false;
	if (bytes[0] === 0x42 && bytes[1] === 0x4d) return false;
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	return DIB_HEADER_SIZES.has(view.getUint32(0, true));
}

/** Wraps bare DIB bytes in a BMP file header so image decoders accept them.
 * Palette/bitfield handling covers 1/4/8-bit paletted and BI_BITFIELDS
 * data; anything truncated throws. */
function dibToBmpBlob(dib: Uint8Array): Blob {
	const view = new DataView(dib.buffer, dib.byteOffset, dib.byteLength);
	const infoSize = view.getUint32(0, true);
	const bitCount = view.getUint16(14, true);
	const compression = view.getUint32(16, true);
	const colorsUsed = view.getUint32(32, true);
	let paletteBytes: number;
	if (compression === 3) {
		paletteBytes = 12; // BI_BITFIELDS color masks
	} else if (bitCount <= 8) {
		paletteBytes = (colorsUsed || 1 << bitCount) * 4;
	} else {
		paletteBytes = 0;
	}
	if (14 + infoSize + paletteBytes > dib.length) throw new Error('Truncated DIB.');
	const header = new DataView(new ArrayBuffer(14));
	header.setUint16(0, 0x4d42, true); // 'BM'
	header.setUint32(2, 14 + dib.length, true);
	header.setUint32(6, 0, true); // reserved
	header.setUint32(10, 14 + infoSize + paletteBytes, true); // bfOffBits
	// Exact copy: BlobPart requires ArrayBufferView<ArrayBuffer>.
	return new Blob([header.buffer, new Uint8Array(dib)], { type: 'image/bmp' });
}

/** Decodes an image blob from the clipboard, tolerating bare CF_DIB bytes
 * (Ditto & co). Throws when the bytes are no decodable image. */
export async function decodeClipboardImageBlob(blob: Blob): Promise<ImageBitmap> {
	try {
		return await createImageBitmap(blob);
	} catch {
		// Fall through to the DIB sniff below.
	}
	const bytes = new Uint8Array(await blob.arrayBuffer());
	if (!isBareDib(bytes)) throw new Error('Not a decodable image.');
	return await createImageBitmap(dibToBmpBlob(bytes));
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
	// Mirror onto the system clipboard too, so Ctrl+V pastes through the
	// browser (and so the copy is usable in other apps). Until this resolves
	// we assume it did NOT work, so the internal clipboard still answers
	// Ctrl+V; a success flips the flag and hands Ctrl+V to the OS clipboard.
	onSystemClipboard = false;
	void writeSurfaceToSystemClipboard(renderer, regionId, bounds.width, bounds.height).then(
		() => {
			onSystemClipboard = true;
		},
		() => {
			showNotice('Copied. System clipboard unavailable here.', 'error');
		}
	);
	return true;
}

/** Copies the selection, then erases it — recorded as ONE 'Cut' history entry. */
export function cutSelection(): boolean {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return false;
	cancelFloatingMove();
	if (!copySelection()) return false;
	return deleteSelection('Cut');
}

/**
 * Copies the whole flattened image (all visible layers + live effects —
 * pixel-identical to Save As PNG) to the internal clipboard AND the system
 * clipboard, so it pastes here (new layer) and in external apps.
 */
export async function copyImage(): Promise<boolean> {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return false;
	const renderer = getEditorRenderer();
	let blob: Blob;
	try {
		blob = await documentToPngBlob(renderer, doc);
	} catch (err) {
		console.error(err);
		showNotice('Could not copy the image.', 'error');
		return false;
	}
	// Internal clipboard (same PNG the system gets) so paste-as-new-layer
	// and Ctrl+V keep working on exactly what was copied.
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(blob);
	} catch (err) {
		console.error(err);
		showNotice('Could not copy the image.', 'error');
		return false;
	}
	const surfaceId = renderer.surfaces.createFromBitmap(bitmap);
	bitmap.close();
	dropContent();
	content = { surfaceId, width: doc.width, height: doc.height };
	showNotice('Copied image to clipboard.');
	// Mirror onto the system clipboard too (same flag contract as
	// copySelection: until this resolves, the internal copy answers Ctrl+V).
	onSystemClipboard = false;
	try {
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
		onSystemClipboard = true;
	} catch {
		showNotice('Copied. System clipboard unavailable here.', 'error');
	}
	return true;
}

/**
 * Pastes the internal clipboard at the TOP-LEFT of the canvas into a NEW layer
 * on the active document, recorded as one 'Paste' history entry.
 *
 * When the image does not fit on the canvas the Paint.NET question is shown
 * first (expand the canvas / keep the canvas size / cancel) — in that case the
 * paste happens only after the user answers.
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
	cancelFloatingMove();
	const surfaces = getEditorRenderer().surfaces;
	if (!surfaces.has(content.surfaceId)) {
		content = null;
		showNotice('Clipboard is empty.', 'error');
		return false;
	}

	// The clipboard surface is owned by the clipboard and must survive the
	// dialog, so the paste blits straight from it (never disposing it).
	return placePastedImage(content.surfaceId, content.width, content.height, false);
}

/**
 * Shared placement for both paste paths. Pastes at the top-left; when the
 * image is larger than the canvas the user is asked what to do first.
 *
 * `ownsSource` must be true when `srcId` is a temporary surface created for
 * this paste — it is then disposed once the pixels have been consumed (or the
 * paste is cancelled).
 */
function placePastedImage(srcId: SurfaceId, w: number, h: number, ownsSource: boolean): boolean {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) {
		if (ownsSource) disposeSource(srcId);
		return false;
	}
	const fits = w <= doc.width && h <= doc.height;
	if (!fits) {
		askOversize(srcId, w, h, ownsSource);
		return true;
	}
	pasteAt(srcId);
	if (ownsSource) disposeSource(srcId);
	return true;
}

function disposeSource(srcId: SurfaceId): void {
	const renderer = getEditorRenderer();
	if (renderer.surfaces.has(srcId)) renderer.surfaces.dispose(srcId);
}

/** Blits `srcId` at the top-left of a fresh doc-sized surface and commits it
 * as the new 'Pasted Layer'. */
function pasteAt(srcId: SurfaceId): void {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return;
	const surfaces = getEditorRenderer().surfaces;
	const surfaceId = surfaces.create(doc.width, doc.height);
	// TOP-LEFT — not centred. Anything that does not fit is clipped by the
	// surface (that is the "keep canvas size" behaviour).
	surfaces.blitRegion(srcId, surfaceId, 0, 0, 'normal', 1);
	commitPasteLayer(surfaceId);
}

/** The answer callback of the dialog currently on screen, if any. A second
 * paste while it is open answers the first one with 'cancel' so its (owned)
 * source surface is released instead of leaking. */
let pendingOversize: (() => void) | null = null;

/**
 * Shows the Paint.NET-style "the image is larger than the canvas" dialog. The
 * preview thumbnail is generated synchronously from the GPU surface; the
 * actual paste waits for the answer.
 */
function askOversize(srcId: SurfaceId, w: number, h: number, ownsSource: boolean): void {
	const doc = documentRegistry.active!;
	const renderer = getEditorRenderer();
	pendingOversize?.();
	const previewUrl = surfaceToPngThumbnailUrl(renderer, srcId, w, h);
	let answered = false;

	const finish = (choice: PasteOversizeChoice) => {
		if (answered) return;
		answered = true;
		pendingOversize = null;
		// A copy while the dialog was open may have dropped the surface.
		const alive = renderer.surfaces.has(srcId);
		if (alive && choice !== 'cancel') {
			if (choice === 'expand') growCanvasFor(w, h);
			pasteAt(srcId);
		}
		if (ownsSource) disposeSource(srcId);
	};
	pendingOversize = () => finish('cancel');

	openDialog('paste', {
		previewUrl,
		imageWidth: w,
		imageHeight: h,
		canvasWidth: doc.width,
		canvasHeight: doc.height,
		onChoose: finish
	} satisfies PasteDialogPayload);
}

/** Grows the canvas (top-left anchored, so nothing moves) to at least
 * `w`×`h`. Recorded as its own undoable 'Canvas Size' entry. */
function growCanvasFor(w: number, h: number): boolean {
	const doc = documentRegistry.active;
	if (!doc) return false;
	const newW = Math.max(doc.width, w);
	const newH = Math.max(doc.height, h);
	if (newW === doc.width && newH === doc.height) return false;
	return resizeCanvas(getEditorRenderer(), newW, newH, -1, -1);
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
 * Pastes an OS-clipboard image (already decoded to a bitmap) as a new layer at
 * the TOP-LEFT of the active document. Closes the bitmap after upload. When
 * the image is larger than the canvas the user is asked what to do first.
 */
export function pasteBitmapAsLayer(bitmap: ImageBitmap): boolean {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) {
		bitmap.close();
		return false;
	}
	cancelFloatingMove();
	const surfaces = getEditorRenderer().surfaces;
	const srcId = surfaces.createFromBitmap(bitmap);
	const w = bitmap.width;
	const h = bitmap.height;
	bitmap.close();
	// The temporary surface is owned by this paste (disposed by placePastedImage).
	return placePastedImage(srcId, w, h, true);
}
