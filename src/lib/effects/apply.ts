// Layer: effects. Moves the generic "render a filter off-screen into a NEW
// surface and swap the layer's surfaceId (undoable)" pipeline out of
// render/effects.ts so every effect (and the legacy adjustments) can share it.

import { RenderTexture, Sprite, type Filter } from 'pixi.js';
import { documentRegistry } from '../core/document/registry';
import type { EditorRenderer } from '../render/EditorRenderer';
import { blitMaskedInto, eraseSelectionRegion } from '../render/selection';
import type { SurfaceId } from '../core/layers/Layer';
import type { EffectContext, EffectSettings, ResolvedEffect } from './types';

/**
 * Applies an arbitrary filter off-screen and swaps the active layer's surface
 * (recorded as one reversible history entry — no readbacks).
 */
export function applyFilterSwap(
	renderer: EditorRenderer,
	label: string,
	makeFilter: () => Filter
): boolean {
	const doc = documentRegistry.active;
	const layer = doc?.activeLayer;
	if (!doc || !layer) return false;

	const surfaces = renderer.surfaces;
	const w = doc.width;
	const h = doc.height;
	const before = layer.surfaceId;
	const src = surfaces.getTexture(before);
	const target = RenderTexture.create({ width: w, height: h, resolution: 1 });

	const sprite = new Sprite(src);
	const filter = makeFilter();
	sprite.filters = [filter];
	renderer.app.renderer.render({ container: sprite, target, clear: true });
	sprite.destroy();
	filter.destroy();
	const filteredId = surfaces.adopt(target);

	// Filter only inside the active selection (Paint.NET semantics): clone the
	// layer, erase the selected region from the clone, then composite the
	// filtered result through the mask. Outside the selection pixels are kept.
	let after: SurfaceId;
	const sel = doc.selection;
	if (sel.active && sel.maskId) {
		after = surfaces.copyRegion(before, { x: 0, y: 0, width: w, height: h });
		eraseSelectionRegion(surfaces, sel.maskId, after, w, h);
		blitMaskedInto(surfaces, sel.maskId, filteredId, after, 'normal', w, h);
		surfaces.dispose(filteredId);
	} else {
		after = filteredId;
	}

	layer.surfaceId = after;
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label,
		memoryBytes: doc.width * doc.height * 4 * 2,
		undo: () => {
			if (layer.surfaceId === after) {
				layer.surfaceId = before;
				renderer.rebuildActiveLayers();
			}
		},
		redo: () => {
			if (layer.surfaceId === before) {
				layer.surfaceId = after;
				renderer.rebuildActiveLayers();
			}
		},
		dispose: () => {
			if (layer.surfaceId === after) surfaces.dispose(before);
			else surfaces.dispose(after);
		}
	});
	return true;
}

/** Applies any registered effect with the given settings (its standard path). */
export function applyEffect(
	renderer: EditorRenderer,
	def: ResolvedEffect,
	settings: EffectSettings
): boolean {
	if (def.isNoop?.(settings)) return false;
	if (def.apply) {
		const ctx: EffectContext = {
			renderer,
			applyFilterSwap: (label, makeFilter) => applyFilterSwap(renderer, label, makeFilter)
		};
		return def.apply(ctx, settings);
	}
	return applyFilterSwap(renderer, def.label, () => def.filter(settings));
}