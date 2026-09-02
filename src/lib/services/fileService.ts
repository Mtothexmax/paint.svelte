// Layer: services. Open/decode/validate/create/export documents. Talks to the
// renderer only through the render singleton (no direct pixi use).

import { newId } from '../core/id';
import { ImageDocument, type ViewState } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import { MAX_DIMENSION, validateSize } from '../core/limits';
import { exportPng } from '../render/export';
import { rendererReady } from '../render/EditorRenderer';
import { fitView } from '../render/Viewport';
import { deviceMaxTextureSize } from './device';
import { showNotice } from '../state/ui';

export interface NewCanvasRequest {
	name?: string;
	width: number;
	height: number;
	background: 'transparent' | string; // hex '#rrggbb'
}

function parseColor(hex: string): number {
	const clean = hex.replace('#', '');
	const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
	return parseInt(value.length === 6 ? value : 'ffffff', 16);
}

function initialView(width: number, height: number, vw: number, vh: number): ViewState {
	if (vw <= 0 || vh <= 0) return { zoom: 1, panX: 0, panY: 0 };
	return fitView(width, height, vw, vh);
}

let untitledCounter = 0;

/** Creates a new blank document with the requested background. */
export async function createNewDocument(req: NewCanvasRequest): Promise<boolean> {
	const name = req.name?.trim() || `Untitled ${++untitledCounter}`;
	const validation = validateSize(req.width, req.height, deviceMaxTextureSize() ?? undefined);
	if (!validation.ok) {
		showNotice(validation.error ?? 'Invalid size.', 'error');
		return false;
	}
	const renderer = await rendererReady;
	const surfaceId =
		req.background === 'transparent'
			? renderer.surfaces.create(req.width, req.height)
			: renderer.surfaces.create(req.width, req.height, parseColor(req.background));
	const doc = new ImageDocument({
		name,
		width: req.width,
		height: req.height,
		surfaceId,
		view: initialView(req.width, req.height, renderer.viewWidth, renderer.viewHeight)
	});
	documentRegistry.open(doc);
	return true;
}

/** Opens files from a picker input (created on demand). */
export function openFromPicker(): void {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/*';
	input.multiple = true;
	input.onchange = () => {
		if (input.files && input.files.length) void openFiles(input.files);
	};
	input.click();
}

/** Decodes + validates files and opens each as a new tab. */
export async function openFiles(fileList: FileList | File[]): Promise<void> {
	const files = Array.from(fileList);
	if (!files.length) return;
	let ok = 0;
	let failed = 0;
	const limit = deviceMaxTextureSize();
	for (const file of files) {
		try {
			const bitmap = await createImageBitmap(file);
			if (bitmap.width > MAX_DIMENSION || bitmap.height > MAX_DIMENSION || bitmap.width * bitmap.height > 2 ** 26) {
				bitmap.close();
				failed++;
				continue;
			}
			const v = validateSize(bitmap.width, bitmap.height, limit ?? undefined);
			if (!v.ok) {
				bitmap.close();
				failed++;
				continue;
			}
			const renderer = await rendererReady;
			const w = bitmap.width;
			const h = bitmap.height;
			const surfaceId = renderer.surfaces.createFromBitmap(bitmap);
			// The texture now owns a copy; the bitmap can be released.
			bitmap.close();
			const doc = new ImageDocument({
				name: file.name || 'Image',
				width: w,
				height: h,
				surfaceId,
				view: initialView(w, h, renderer.viewWidth, renderer.viewHeight)
			});
			documentRegistry.open(doc);
			ok++;
		} catch {
			failed++;
		}
	}
	if (ok > 0) {
		showNotice(`Opened ${ok} document${ok > 1 ? 's' : ''}.`);
	}
	if (failed > 0) {
		showNotice(
			failed === files.length
				? 'Could not open the file(s): unsupported or too large.'
				: `${failed} file(s) skipped (unsupported or too large).`,
			'error'
		);
	}
}

/** Exports the active document as PNG via a download. */
export async function exportActiveDocument(): Promise<void> {
	const doc = documentRegistry.active;
	if (!doc) {
		showNotice('No document is open.', 'error');
		return;
	}
	const renderer = await rendererReady;
	try {
		await exportPng(renderer, doc);
	} catch (err) {
		console.error(err);
		showNotice('Export failed.', 'error');
	}
}

/** Closes the active document (if any). */
export function closeActiveDocument(): void {
	const doc = documentRegistry.active;
	if (doc) documentRegistry.close(doc.id);
}

/** Switches the active tab to the given document. */
export function switchToDocument(id: string): void {
	documentRegistry.setActive(id);
}

/** Closes a specific document (tab). */
export function closeDocument(id: string): void {
	documentRegistry.close(id);
}

/** Convenience id generator re-export kept local to this service. */
export { newId };
