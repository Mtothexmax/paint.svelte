// Layer: services. Layer metadata operations on the active document, each
// recorded in the doc history so they undo/redo cleanly. Pixel changes stay in
// their own raster commands (region snapshots).

import { documentRegistry } from '../core/document/registry';
import { createRasterLayer, isLayerBlendMode, LAYER_BLEND_MODES, type Layer } from '../core/layers/Layer';
import { getEditorRenderer } from '../render/EditorRenderer';

function touch(doc: import('../core/document/ImageDocument').ImageDocument) {
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
}

function rebuild() {
	getEditorRenderer().rebuildActiveLayers();
}

function activeDoc() {
	return documentRegistry.active;
}

function ensureActive(doc: import('../core/document/ImageDocument').ImageDocument, removedId: string) {
	if (doc.activeLayerId === removedId || !doc.layers.some((l) => l.id === doc.activeLayerId)) {
		const last = doc.layers[doc.layers.length - 1];
		if (last) doc.activeLayerId = last.id;
	}
}

/** Adds a new empty raster layer on top. */
export function addLayer(): void {
	const doc = activeDoc();
	if (!doc) return;
	const renderer = getEditorRenderer();
	const surfaceId = renderer.surfaces.create(doc.width, doc.height);
	const name = `Layer ${doc.layers.length + 1}`;
	const layer = createRasterLayer(surfaceId, name);
	const index = doc.layers.length;

	doc.insertLayer(layer, index);
	doc.setActiveLayer(layer.id);
	rebuild();
	touch(doc);

	doc.history.push({
		label: 'Add Layer',
		undo: () => {
			doc.removeLayer(layer.id);
			ensureActive(doc, layer.id);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.insertLayer(layer, index);
			doc.setActiveLayer(layer.id);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {
			if (!doc.layers.includes(layer)) renderer.surfaces.dispose(surfaceId);
		}
	});
}

/** Deletes a layer (never the last one). */
export function deleteLayer(id?: string): void {
	const doc = activeDoc();
	if (!doc || doc.layers.length <= 1) return;
	const target = id ?? doc.activeLayerId ?? '';
	const index = doc.indexOfLayer(target);
	if (index < 0) return;
	const layer = doc.layers[index];
	const renderer = getEditorRenderer();
	const surfaceId = layer.surfaceId;
	const wasActive = doc.activeLayerId === layer.id;

	doc.removeLayer(target);
	ensureActive(doc, target);
	rebuild();
	touch(doc);

	doc.history.push({
		label: 'Delete Layer',
		undo: () => {
			doc.insertLayer(layer, index);
			if (wasActive) doc.setActiveLayer(layer.id);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.removeLayer(layer.id);
			ensureActive(doc, layer.id);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {
			if (!doc.layers.includes(layer)) renderer.surfaces.dispose(surfaceId);
		}
	});
}

/** Moves the given layer by `delta` (reorder). */
export function moveLayer(id: string, delta: number): void {
	const doc = activeDoc();
	if (!doc) return;
	const from = doc.indexOfLayer(id);
	if (from < 0) return;
	reorderLayer(id, from + delta);
}

/** Moves the given layer to the absolute stack index `to` (0 = bottom). */
export function reorderLayer(id: string, to: number): void {
	const doc = activeDoc();
	if (!doc) return;
	const from = doc.indexOfLayer(id);
	if (from < 0) return;
	to = Math.max(0, Math.min(doc.layers.length - 1, to));
	if (to === from) return;

	doc.moveLayer(id, to);
	rebuild();
	touch(doc);

	doc.history.push({
		label: 'Reorder Layer',
		undo: () => {
			doc.moveLayer(id, from);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.moveLayer(id, to);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {}
	});
}

/** Sets a layer's visibility (undoable). */
export function setLayerVisibility(id: string, visible: boolean): void {
	const doc = activeDoc();
	if (!doc) return;
	const layer = doc.layers.find((l) => l.id === id);
	if (!layer || layer.visible === visible) return;
	const old = layer.visible;

	doc.setLayerVisible(id, visible);
	rebuild();
	touch(doc);

	doc.history.push({
		label: visible ? 'Show Layer' : 'Hide Layer',
		undo: () => {
			doc.setLayerVisible(id, old);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.setLayerVisible(id, visible);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {}
	});
}

/**
 * Live-opacity preview (no history/dirty entry — used while dragging the
 * slider; only the final value is committed via commitLayerOpacity).
 */
export function setLayerOpacityLive(id: string, opacity: number): void {
	const doc = activeDoc();
	if (!doc) return;
	doc.setLayerOpacity(id, opacity);
	rebuild();
	documentRegistry.notifyChange(doc);
}

/**
 * Commits one opacity change as a SINGLE history entry (called on slider
 * release). `from` is the opacity at the start of the drag gesture.
 */
export function commitLayerOpacity(id: string, from: number, to: number): void {
	const doc = activeDoc();
	if (!doc) return;
	const layer = doc.layers.find((l) => l.id === id);
	if (!layer) return;
	const value = Math.max(0, Math.min(1, to));
	const old = Math.max(0, Math.min(1, from));
	if (Math.abs(old - value) < 1e-6) return;

	doc.setLayerOpacity(id, value);
	rebuild();
	touch(doc);

	doc.history.push({
		label: 'Layer Opacity',
		undo: () => {
			doc.setLayerOpacity(id, old);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.setLayerOpacity(id, value);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {}
	});
}

/** Selects the active layer (not part of history). */
export function selectLayer(id: string): void {
	const doc = activeDoc();
	if (!doc) return;
	doc.setActiveLayer(id);
	documentRegistry.notifyChange(doc);
}

/** Merges the active layer down into the layer below it (opacity + blend
 * mode applied, undoable). No-op when the active layer is the bottom one. */
export function mergeDown(): void {
	const doc = activeDoc();
	if (!doc) return;
	const index = doc.indexOfLayer(doc.activeLayerId ?? '');
	if (index <= 0) return;
	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	const active = doc.layers[index];
	const below = doc.layers[index - 1];
	const belowBefore = below.surfaceId;

	const merged = surfaces.copyRegion(belowBefore, { x: 0, y: 0, width: doc.width, height: doc.height });
	surfaces.compositeLayer(active.surfaceId, merged, active.opacity, active.blendMode);

	const activeId = active.id;
	const belowId = below.id;
	doc.removeLayer(activeId);
	below.surfaceId = merged;
	doc.setActiveLayer(belowId);
	rebuild();
	touch(doc);

	doc.history.push({
		label: 'Merge Down',
		undo: () => {
			below.surfaceId = belowBefore;
			doc.insertLayer(active, index);
			doc.setActiveLayer(activeId);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			below.surfaceId = merged;
			doc.removeLayer(activeId);
			ensureActive(doc, activeId);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {
			if (!doc.layers.includes(active)) {
				surfaces.dispose(belowBefore);
				surfaces.dispose(active.surfaceId);
			} else {
				surfaces.dispose(merged);
			}
		}
	});
}

/** Duplicates the given layer (pixels copied via GPU region copy). */
export function duplicateLayer(id: string): void {
	const doc = activeDoc();
	if (!doc) return;
	const src = doc.layers.find((l) => l.id === id);
	if (!src) return;
	const renderer = getEditorRenderer();
	const copyId = renderer.surfaces.copyRegion(src.surfaceId, {
		x: 0,
		y: 0,
		width: doc.width,
		height: doc.height
	});
	const layer: Layer = {
		...src,
		id: `layer-${crypto.randomUUID()}`,
		surfaceId: copyId,
		name: `${src.name} copy`
	};
	const index = doc.indexOfLayer(id) + 1;
	doc.insertLayer(layer, index);
	doc.setActiveLayer(layer.id);
	rebuild();
	touch(doc);

	doc.history.push({
		label: 'Duplicate Layer',
		undo: () => {
			doc.removeLayer(layer.id);
			ensureActive(doc, layer.id);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.insertLayer(layer, index);
			doc.setActiveLayer(layer.id);
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {
			if (!doc.layers.includes(layer)) renderer.surfaces.dispose(copyId);
		}
	});
}

/** Sets a layer's blend mode (undoable). Unknown ids are ignored. */
export function setLayerBlendMode(id: string, mode: string): void {
	if (!isLayerBlendMode(mode)) return;
	const doc = activeDoc();
	if (!doc) return;
	const layer = doc.layers.find((l) => l.id === id);
	if (!layer || layer.blendMode === mode) return;
	const old = layer.blendMode;

	layer.blendMode = mode;
	rebuild();
	touch(doc);

	doc.history.push({
		label: 'Layer Blend Mode',
		undo: () => {
			layer.blendMode = old;
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			layer.blendMode = mode;
			rebuild();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {}
	});
}

/** Blend-mode dropdown options (id + display label). */
export const BLEND_MODE_OPTIONS: Array<{ id: (typeof LAYER_BLEND_MODES)[number]; label: string }> = [
	{ id: 'normal', label: 'Normal' },
	{ id: 'multiply', label: 'Multiply' },
	{ id: 'screen', label: 'Screen' },
	{ id: 'overlay', label: 'Overlay' },
	{ id: 'darken', label: 'Darken' },
	{ id: 'lighten', label: 'Lighten' },
	{ id: 'color-dodge', label: 'Color Dodge' },
	{ id: 'color-burn', label: 'Color Burn' },
	{ id: 'hard-light', label: 'Hard Light' },
	{ id: 'soft-light', label: 'Soft Light' },
	{ id: 'difference', label: 'Difference' },
	{ id: 'exclusion', label: 'Exclusion' },
	{ id: 'add', label: 'Additive' }
];

/** Current layer snapshot for a document (used by the Layers panel). */
export interface LayerRow {
	id: string;
	name: string;
	visible: boolean;
	opacity: number;
	blendMode: string;
	active: boolean;
	index: number;
}

export function layerRows(doc: import('../core/document/ImageDocument').ImageDocument): LayerRow[] {
	// top-most first in the panel
	return [...doc.layers]
		.reverse()
		.map((l, i, arr) => ({
			id: l.id,
			name: l.name,
			visible: l.visible,
			opacity: l.opacity,
			blendMode: isLayerBlendMode(l.blendMode) ? l.blendMode : 'normal',
			active: l.id === doc.activeLayerId,
			index: arr.length - 1 - i
		}));
}
