// Layer: render (pixi). Resize the active document — either scale every layer
// into a new size (Image > Resize) or grow/shrink the canvas around the
// existing content using a 9-position anchor (Image > Canvas Size; the area
// beyond the old canvas is transparent). Both record ONE undoable history
// entry and reuse the same commit/dispose machinery as crop to selection.

import { Sprite } from 'pixi.js';
import { createSurfaceTexture } from './surfaceTexture';
import { documentRegistry } from '../core/document/registry';
import { cancelFloatingMove } from '../state/moveTransform';
import { emptySelection } from '../core/selection/SelectionModel';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';

/** Content anchor along one axis of the canvas: -1 = start, 0 = center, 1 = end. */
export type ResizeAnchor = -1 | 0 | 1;

interface LayerSwap {
	layerId: string;
	before: SurfaceId;
	after: SurfaceId;
}

interface ResizePlan {
	label: string;
	width: number;
	height: number;
	swaps: LayerSwap[];
	/** The doc.view to apply after committing (keeps the content in view). */
	view: { zoom: number; panX: number; panY: number };
}

/** Scales a surface's contents into a new wNew×hNew surface. */
function scaleSurface(renderer: EditorRenderer, srcId: SurfaceId, wNew: number, hNew: number): SurfaceId {
	const rt = createSurfaceTexture(wNew, hNew);
	const sprite = new Sprite(renderer.surfaces.getTexture(srcId));
	sprite.width = wNew;
	sprite.height = hNew;
	renderer.surfaces.renderInto(rt, sprite, true);
	sprite.destroy();
	return renderer.surfaces.adopt(rt);
}

/** Places a surface's contents into a new surface at (dx, dy) — the area
 * outside is left transparent. */
function placeSurface(
	renderer: EditorRenderer,
	srcId: SurfaceId,
	wNew: number,
	hNew: number,
	dx: number,
	dy: number
): SurfaceId {
	const rt = createSurfaceTexture(wNew, hNew);
	const sprite = new Sprite(renderer.surfaces.getTexture(srcId));
	sprite.position.set(dx, dy);
	renderer.surfaces.renderInto(rt, sprite, true);
	sprite.destroy();
	return renderer.surfaces.adopt(rt);
}

function anchorOffset(anchor: ResizeAnchor, diff: number): number {
	if (anchor === -1) return 0; // keep content at the start edge
	if (anchor === 1) return diff; // keep content at the end edge
	return Math.round(diff / 2); // center it
}

/** Swaps layer surface handles to `ref`; only touches layers that currently
 * hold the other handle (so undo/redo stay idempotent against later edits). */
function applySwaps(doc: ImageDocument, swaps: LayerSwap[], ref: 'before' | 'after'): void {
	for (const s of swaps) {
		const layer = doc.layers.find((l) => l.id === s.layerId);
		if (!layer) continue;
		if (ref === 'after' && layer.surfaceId === s.before) layer.surfaceId = s.after;
		if (ref === 'before' && layer.surfaceId === s.after) layer.surfaceId = s.before;
	}
}

function commitResize(renderer: EditorRenderer, doc: ImageDocument, plan: ResizePlan): void {
	const surfaces = renderer.surfaces;
	const beforeView = { ...doc.view };
	const beforeW = doc.width;
	const beforeH = doc.height;
	const beforeSelection = doc.selection;

	applySwaps(doc, plan.swaps, 'after');
	doc.width = plan.width;
	doc.height = plan.height;
	doc.view = { ...plan.view };
	doc.selection = emptySelection();

	renderer.rebuildActiveLayers();
	renderer.refreshActiveView();
	renderer.refreshActiveSelection();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: plan.label,
		memoryBytes: plan.width * plan.height * 4 * plan.swaps.length,
		undo: () => {
			doc.width = beforeW;
			doc.height = beforeH;
			doc.view = { ...beforeView };
			doc.selection = beforeSelection;
			applySwaps(doc, plan.swaps, 'before');
			renderer.rebuildActiveLayers();
			renderer.refreshActiveView();
			renderer.refreshActiveSelection();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.width = plan.width;
			doc.height = plan.height;
			doc.view = { ...plan.view };
			doc.selection = emptySelection();
			applySwaps(doc, plan.swaps, 'after');
			renderer.rebuildActiveLayers();
			renderer.refreshActiveView();
			renderer.refreshActiveSelection();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {
			const activeAfter = plan.swaps.every((s) => {
				const layer = doc.layers.find((l) => l.id === s.layerId);
				return layer && layer.surfaceId === s.after;
			});
			for (const s of plan.swaps) surfaces.dispose(activeAfter ? s.before : s.after);
		}
	});
}

function snap(value: number, fallback: number): number {
	const v = Math.round(value);
	return Number.isFinite(v) && v >= 1 ? v : fallback;
}

/** Scales the whole document to `width`×`height` (all layers). The current
 * image center stays in place on screen. */
export function resizeImage(renderer: EditorRenderer, width: number, height: number): boolean {
	const doc = documentRegistry.active;
	if (!doc) return false;
	const w = snap(width, doc.width);
	const h = snap(height, doc.height);
	if (w === doc.width && h === doc.height) return false;
	cancelFloatingMove();

	const swaps: LayerSwap[] = [];
	for (const layer of doc.layers) {
		swaps.push({ layerId: layer.id, before: layer.surfaceId, after: scaleSurface(renderer, layer.surfaceId, w, h) });
	}
	const zoom = doc.view.zoom;
	commitResize(renderer, doc, {
		label: 'Resize Image',
		width: w,
		height: h,
		swaps,
		view: {
			zoom,
			panX: doc.view.panX + ((doc.width - w) * zoom) / 2,
			panY: doc.view.panY + ((doc.height - h) * zoom) / 2
		}
	});
	return true;
}

/** Grows/shrinks the canvas to `width`×`height`. Existing content is placed
 * with a 9-position anchor (`ax`/`ay` in {-1, 0, 1}); the area outside the old
 * canvas becomes transparent. Content stays at its screen position. */
export function resizeCanvas(
	renderer: EditorRenderer,
	width: number,
	height: number,
	ax: ResizeAnchor = 0,
	ay: ResizeAnchor = 0
): boolean {
	const doc = documentRegistry.active;
	if (!doc) return false;
	const w = snap(width, doc.width);
	const h = snap(height, doc.height);
	if (w === doc.width && h === doc.height) return false;
	cancelFloatingMove();

	const dx = anchorOffset(ax, w - doc.width);
	const dy = anchorOffset(ay, h - doc.height);
	const swaps: LayerSwap[] = [];
	for (const layer of doc.layers) {
		swaps.push({
			layerId: layer.id,
			before: layer.surfaceId,
			after: placeSurface(renderer, layer.surfaceId, w, h, dx, dy)
		});
	}
	const zoom = doc.view.zoom;
	commitResize(renderer, doc, {
		label: 'Canvas Size',
		width: w,
		height: h,
		swaps,
		view: { zoom, panX: doc.view.panX - dx * zoom, panY: doc.view.panY - dy * zoom }
	});
	return true;
}