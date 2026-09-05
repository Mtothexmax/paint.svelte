// Layer: services. Paint-bucket fill on the active layer. The click seed,
// tolerance and flood mode come from the canvas + the fill settings; the
// region mask comes from render/fill (real scanline flood fill over a GPU
// readback, GPU-composited). One undoable surface swap, same pattern as
// Fill/Delete.
//
// Live re-apply: the last fill stays "live" while it is the current layer
// state (nothing painted over it, same document/layer). Changing tolerance or
// flood mode then REBUILDS that fill from its original seed/colour (from the
// pristine pre-fill surface — never stacked) and patches the history entry in
// place instead of pushing a new one. Undo/redo keep working: undo returns to
// the pre-fill surface, redo to the latest rebuild.

import { get } from 'svelte/store';
import { documentRegistry } from '../core/document/registry';
import type { RGBA } from '../core/color';
import { getEditorRenderer, hasEditorRenderer } from '../render/EditorRenderer';
import { buildFillMaskSurface, intersectMaskWithSelection, maskHasContent, paintMaskedColor } from '../render/fill';
import type { HistoryEntry } from '../core/history/HistoryStack';
import type { SurfaceId } from '../core/layers/Layer';
import { fillTolerance, fillFloodMode, type FloodMode } from '../state/fill';

interface FillRecord {
	docId: string;
	layerId: string;
	beforeId: SurfaceId;
	afterId: SurfaceId;
	seedX: number;
	seedY: number;
	color: RGBA;
	tolerance: number;
	mode: FloodMode;
	entry: HistoryEntry;
}

let lastFill: FillRecord | null = null;

/** Builds a filled layer surface from the PRISTINE pre-fill surface. */
type FilledResult = { kind: 'ok'; afterId: SurfaceId } | { kind: 'empty' } | { kind: 'failed' };

function buildFilledSurface(rec: {
	beforeId: SurfaceId;
	seedX: number;
	seedY: number;
	color: RGBA;
	tolerance: number;
	mode: FloodMode;
}): FilledResult {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return { kind: 'failed' };
	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	let mask = buildFillMaskSurface(renderer, rec.beforeId, doc.width, doc.height, {
		x: rec.seedX,
		y: rec.seedY,
		tolerance: rec.tolerance,
		mode: rec.mode
	});
	if (!mask) return { kind: 'failed' };
	let clippedBySelection = false;
	if (doc.selection.active && doc.selection.maskId && surfaces.has(doc.selection.maskId)) {
		const clipped = intersectMaskWithSelection(surfaces, mask, doc.selection.maskId, doc.width, doc.height);
		surfaces.dispose(mask);
		mask = clipped;
		clippedBySelection = true;
	}
	if (clippedBySelection && !maskHasContent(renderer, mask, doc.width, doc.height)) {
		// Seed outside the selection (or an empty one) — nothing would land.
		surfaces.dispose(mask);
		return { kind: 'empty' };
	}
	const afterId = surfaces.copyRegion(rec.beforeId, { x: 0, y: 0, width: doc.width, height: doc.height });
	paintMaskedColor(surfaces, afterId, mask, rec.color, doc.width, doc.height);
	surfaces.dispose(mask);
	return { kind: 'ok', afterId };
}

/**
 * Fill outcome (drives the canvas notice — no silent no-ops):
 * - 'ok': filled (orTransparent re-apply handled it — still 'ok');
 * - 'out-of-bounds': seed outside the canvas;
 * - 'outside-selection': an active selection clips everything away;
 * - 'transparent': the fill colour is fully transparent (nothing visible);
 * - 'failed': no doc/layer or the mask build failed.
 */
export type FillResult = 'ok' | 'out-of-bounds' | 'outside-selection' | 'transparent' | 'failed';

/**
 * Fills from `seed` (image px, may be fractional — snapped here) with
 * `color`. Left button passes the foreground colour, right button the
 * background colour (Paint.NET behaviour).
 */
export function applyFill(seedX: number, seedY: number, color: RGBA): FillResult {
	const doc = documentRegistry.active;
	if (!doc || !hasEditorRenderer()) return 'failed';
	const layer = doc.activeLayer;
	if (!layer) return 'failed';
	const x = Math.floor(seedX);
	const y = Math.floor(seedY);
	if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return 'out-of-bounds';
	if (Math.round(color.a) <= 0) return 'transparent';

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	console.info(
		'[fill]',
		`click=(${x},${y}) tol=${get(fillTolerance)} mode=${get(fillFloodMode)}`,
		`color=(${color.r},${color.g},${color.b},${color.a})`,
		`layer visible=${layer.visible} opacity=${layer.opacity} selection=${doc.selection.active}`
	);
	const rec: FillRecord = {
		docId: doc.id,
		layerId: layer.id,
		beforeId: layer.surfaceId,
		afterId: '' as SurfaceId,
		seedX: x,
		seedY: y,
		color: { ...color },
		tolerance: get(fillTolerance),
		mode: get(fillFloodMode),
		entry: undefined as unknown as HistoryEntry
	};
	const built = buildFilledSurface(rec);
	if (built.kind === 'empty') return 'outside-selection';
	if (built.kind === 'failed') return 'failed';
	rec.afterId = built.afterId;

	layer.surfaceId = built.afterId;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	const label = () => (rec.mode === 'global' ? 'Fill' : 'Paint Bucket');
	rec.entry = {
		label: label(),
		memoryBytes: doc.width * doc.height * 4 * 2,
		undo: () => {
			if (layer.surfaceId === rec.afterId) {
				layer.surfaceId = rec.beforeId;
				renderer.rebuildActiveLayers();
			}
		},
		redo: () => {
			if (layer.surfaceId === rec.beforeId) {
				layer.surfaceId = rec.afterId;
				renderer.rebuildActiveLayers();
			}
		},
		dispose: () => {
			if (layer.surfaceId === rec.afterId) surfaces.dispose(rec.beforeId);
			else surfaces.dispose(rec.afterId);
		}
	};
	doc.history.push(rec.entry);
	lastFill = rec;
	return 'ok';
}

/**
 * Rebuilds the live last fill with the CURRENT tolerance/mode (seed, colour
 * and pre-fill surface stay fixed) and patches the history entry in place.
 * No-op unless the fill is still the current layer state — after an undo,
 * another stroke, a layer/doc switch, the settings just apply to the next
 * fill instead.
 */
export function reapplyLastFill(): boolean {
	const rec = lastFill;
	if (!rec) return false;
	const doc = documentRegistry.active;
	if (!doc || doc.id !== rec.docId || !hasEditorRenderer()) {
		if (!doc || doc.id !== rec.docId) lastFill = null;
		return false;
	}
	const layer = doc.layers.find((l) => l.id === rec.layerId);
	if (!layer || layer.surfaceId !== rec.afterId) {
		if (!layer) lastFill = null;
		return false;
	}
	const tolerance = get(fillTolerance);
	const mode = get(fillFloodMode);
	if (tolerance === rec.tolerance && mode === rec.mode) return true;

	const renderer = getEditorRenderer();
	const surfaces = renderer.surfaces;
	const next: FillRecord = { ...rec, tolerance, mode, afterId: '' as SurfaceId };
	const built = buildFilledSurface(next);
	if (built.kind !== 'ok') return false;
	const afterId = built.afterId;

	const staleId = rec.afterId;
	rec.afterId = afterId;
	rec.tolerance = tolerance;
	rec.mode = mode;
	rec.entry.label = mode === 'global' ? 'Fill' : 'Paint Bucket';
	layer.surfaceId = afterId;
	renderer.rebuildActiveLayers();
	// The replaced surface is fully superseded (undo points at beforeId,
	// redo at the new afterId) — free it right away.
	surfaces.dispose(staleId);
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
	return true;
}

// Tolerance/mode edits live-update the last fill (reapplyLastFill no-ops
// when there is no live fill — including the immediate subscribe call).
fillTolerance.subscribe(() => {
	reapplyLastFill();
});
fillFloodMode.subscribe(() => {
	reapplyLastFill();
});
