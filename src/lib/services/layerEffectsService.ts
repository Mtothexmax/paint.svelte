// Layer: services. Live layer effects — add / remove / update / toggle / bake.
//
// Layer effects are stored on the Layer model and rendered live in DocScene
// (off-screen filter chain). They are non-destructive until "baked" via
// `bakeLayerEffects`, which renders them into the layer's base surface and
// clears the effects array.

import { Sprite } from 'pixi.js';
import { documentRegistry } from '../core/document/registry';
import type { Layer, LayerEffect } from '../core/layers/Layer';
import { getEditorRenderer, hasEditorRenderer } from '../render/EditorRenderer';
import { effectById } from '../effects';
import type { EffectSettings } from '../effects';

function getDocAndLayer(layerId: string): { doc: import('../core/document/ImageDocument').ImageDocument; layer: Layer } | null {
	const doc = documentRegistry.active;
	const layer = doc?.layers.find((l) => l.id === layerId);
	if (!doc || !layer) return null;
	return { doc, layer };
}

/** Adds a new layer effect to the given layer. Returns true on success. */
export function addLayerEffect(layerId: string, effectId: string, settings: EffectSettings): boolean {
	const r = getDocAndLayer(layerId);
	if (!r) return false;
	const { doc, layer } = r;
	const def = effectById(effectId);
	if (!def) return false;

	if (!layer.effects) layer.effects = [];
	layer.effects.push({ id: effectId, settings: { ...settings }, enabled: true });

	getEditorRenderer().refreshLayerEffects(layerId);
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
	return true;
}

/** Removes a layer effect by index. Returns true on success. */
export function removeLayerEffect(layerId: string, index: number): boolean {
	const r = getDocAndLayer(layerId);
	if (!r) return false;
	const { doc, layer } = r;
	if (!layer.effects || index < 0 || index >= layer.effects.length) return false;

	layer.effects.splice(index, 1);
	if (!layer.effects.length) delete layer.effects;

	getEditorRenderer().refreshLayerEffects(layerId);
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
	return true;
}

/** Toggles a layer effect's enabled state. Returns true on success. */
export function toggleLayerEffect(layerId: string, index: number): boolean {
	const r = getDocAndLayer(layerId);
	if (!r) return false;
	const { doc, layer } = r;
	if (!layer.effects || index < 0 || index >= layer.effects.length) return false;

	layer.effects[index].enabled = !layer.effects[index].enabled;

	getEditorRenderer().refreshLayerEffects(layerId);
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
	return true;
}

/**
 * Moves a layer effect within the chain. `to` is the insertion index in the
 * array AFTER removal (0 = top). No-op when from === to. Returns true on
 * success.
 */
export function reorderLayerEffect(layerId: string, from: number, to: number): boolean {
	const r = getDocAndLayer(layerId);
	if (!r) return false;
	const { doc, layer } = r;
	if (!layer.effects || from < 0 || from >= layer.effects.length) return false;

	const clampedTo = Math.max(0, Math.min(to, layer.effects.length - 1));
	if (from === clampedTo) return true;
	const [moved] = layer.effects.splice(from, 1);
	layer.effects.splice(clampedTo, 0, moved);

	getEditorRenderer().refreshLayerEffects(layerId);
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
	return true;
}

/** In-memory clipboard holding a copied effect chain (deep-cloned). */
let copiedEffects: LayerEffect[] | null = null;

/**
 * Copies the full effect chain of the given layer into the in-memory
 * clipboard. Returns true on success (or when the layer has no effects, so
 * pasting a chain can be hidden — callers check `hasCopiedEffects`).
 */
export function copyLayerEffects(layerId: string): boolean {
	const r = getDocAndLayer(layerId);
	if (!r) return false;
	copiedEffects = r.layer.effects
		? r.layer.effects.map((e) => ({ id: e.id, settings: { ...e.settings }, enabled: e.enabled }))
		: null;
	return true;
}

/** True when a copied effect chain is available for pasting. */
export function hasCopiedEffects(): boolean {
	return copiedEffects !== null;
}

/**
 * Replaces the target layer's effect chain with the copied one (deep-cloned).
 * Returns true on success, false when nothing was copied.
 */
export function pasteLayerEffects(layerId: string): boolean {
	if (!copiedEffects) return false;
	const r = getDocAndLayer(layerId);
	if (!r) return false;
	const { doc, layer } = r;

	const chain = copiedEffects.map((e) => ({ id: e.id, settings: { ...e.settings }, enabled: e.enabled }));
	layer.effects = chain.length ? chain : undefined;

	getEditorRenderer().refreshLayerEffects(layerId);
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
	return true;
}

/** Updates the settings of a layer effect. Returns true on success. */
export function updateLayerEffectSettings(layerId: string, index: number, settings: EffectSettings): boolean {
	const r = getDocAndLayer(layerId);
	if (!r) return false;
	const { doc, layer } = r;
	if (!layer.effects || index < 0 || index >= layer.effects.length) return false;

	layer.effects[index].settings = { ...settings };

	getEditorRenderer().refreshLayerEffects(layerId);
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);
	return true;
}

/**
 * Bakes (renders) all enabled layer effects into the layer's base surface and
 * clears the effects array. This is the "Render Layer Effects to Layer"
 * operation — destructive but produces a plain surface that can be edited
 * freely. Recorded as one undoable history entry.
 */
export function bakeLayerEffects(layerId: string): boolean {
	const r = getDocAndLayer(layerId);
	if (!r) return false;
	const { doc, layer } = r;
	if (!hasEditorRenderer()) return false;
	const renderer = getEditorRenderer();

	const effs = layer.effects?.filter((e) => e.enabled) ?? [];
	if (!effs.length) return false;

	const beforeId = layer.surfaceId;
	const w = doc.width;
	const h = doc.height;

	// Build a filter chain from the enabled effects and render it off-screen
	// through applyFilterSwap's pipeline.
	const filters = effs
		.map((e) => {
			const def = effectById(e.id);
			return def ? def.filter(e.settings) : null;
		})
		.filter((f): f is import('pixi.js').Filter => f !== null);

	if (!filters.length) return false;

	const afterId = renderer.surfaces.create(w, h);
	const srcTex = renderer.surfaces.getTexture(beforeId);

	// Ping-pong render through the filter chain.
	let ping = renderer.surfaces.create(w, h);
	let pong = renderer.surfaces.create(w, h);
	let src = srcTex;

	for (const filter of filters) {
		const sprite = new Sprite(src);
		sprite.filters = [filter];
		renderer.app.renderer.render({ container: sprite, target: renderer.surfaces.getTexture(ping), clear: true });
		sprite.destroy();
		filter.destroy();
		src = renderer.surfaces.getTexture(ping);
		const t = ping;
		ping = pong;
		pong = t;
	}

	// `src` is the final texture. Copy it to `afterId`.
	const finalSprite = new Sprite(src);
	renderer.app.renderer.render({ container: finalSprite, target: renderer.surfaces.getTexture(afterId), clear: true });
	finalSprite.destroy();

	// Dispose temps.
	renderer.surfaces.dispose(ping);
	renderer.surfaces.dispose(pong);

	// Update layer.
	const oldEffects = layer.effects ? [...layer.effects] : undefined;
	layer.surfaceId = afterId;
	delete layer.effects;
	renderer.refreshLayerEffects(layerId);
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: 'Render Layer Effects',
		memoryBytes: w * h * 4 * 2,
		undo: () => {
			if (layer.surfaceId === afterId) {
				layer.surfaceId = beforeId;
				layer.effects = oldEffects;
				renderer.refreshLayerEffects(layerId);
			}
		},
		redo: () => {
			if (layer.surfaceId === beforeId) {
				layer.surfaceId = afterId;
				delete layer.effects;
				renderer.refreshLayerEffects(layerId);
			}
		},
		dispose: () => {
			if (layer.surfaceId === afterId) renderer.surfaces.dispose(beforeId);
			else renderer.surfaces.dispose(afterId);
		}
	});
	return true;
}
