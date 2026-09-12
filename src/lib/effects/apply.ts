// Layer: effects. Moves the generic "render a filter off-screen into a NEW
// surface and swap the layer's surfaceId (undoable)" pipeline out of
// render/effects.ts so every effect (and the legacy adjustments) can share it.

import { RenderTexture, Sprite, type Filter, type Texture } from 'pixi.js';
import { createSurfaceTexture } from '../render/surfaceTexture';
import { documentRegistry } from '../core/document/registry';
import type { EditorRenderer } from '../render/EditorRenderer';
import { blitMaskedInto, eraseSelectionRegion } from '../render/selection';
import type { SurfaceId } from '../core/layers/Layer';
import { asFilterChain, type EffectContext, type EffectSettings, type ResolvedEffect } from './types';
import { cancelFloatingMove } from '../state/moveTransform';

/**
 * Renders `src` through a chain of filters into `target`. A single pass is
 * rendered straight through; longer chains ping-pong via temporary textures.
 * Every filter in the chain is destroyed afterwards — the caller must not
 * reuse them.
 */
export function renderFilterChain(
	renderer: EditorRenderer,
	src: Texture,
	target: RenderTexture,
	chain: Filter[]
): void {
	if (!chain.length) {
		const sprite = new Sprite(src);
		renderer.app.renderer.render({ container: sprite, target, clear: true });
		sprite.destroy();
		return;
	}
	let current: Texture = src;
	let temp: RenderTexture | null = null;
	for (let i = 0; i < chain.length; i++) {
		const last = i === chain.length - 1;
		const out = last ? target : createSurfaceTexture(target.width, target.height);
		const sprite = new Sprite(current);
		sprite.filters = [chain[i]];
		renderer.app.renderer.render({ container: sprite, target: out, clear: true });
		sprite.destroy();
		chain[i].destroy();
		if (temp) temp.destroy(true);
		temp = last ? null : out;
		current = out;
	}
}

/**
 * Applies an arbitrary filter (or filter chain) off-screen and swaps the
 * active layer's surface (recorded as one reversible history entry — no
 * readbacks). A chain is rendered pass by pass, ping-ponging between two
 * temporary textures.
 */
export function applyFilterSwap(
	renderer: EditorRenderer,
	label: string,
	makeFilter: () => Filter | Filter[]
): boolean {
	const doc = documentRegistry.active;
	const layer = doc?.activeLayer;
	if (!doc || !layer) return false;
	cancelFloatingMove();

	const surfaces = renderer.surfaces;
	const w = doc.width;
	const h = doc.height;
	const before = layer.surfaceId;
	const src = surfaces.getTexture(before);
	const target = createSurfaceTexture(w, h);

	const chain = asFilterChain(makeFilter());
	renderFilterChain(renderer, src, target, chain);
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
	cancelFloatingMove();
	if (def.apply) {
		const ctx: EffectContext = {
			renderer,
			applyFilterSwap: (label, makeFilter) => applyFilterSwap(renderer, label, makeFilter)
		};
		return def.apply(ctx, settings);
	}
	return applyFilterSwap(renderer, def.label, () => def.filter(settings));
}