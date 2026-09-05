// Layer: state (Svelte adapter). Holds small PNG previews per layer so the
// Layers panel can show each layer's content. Generated lazily (GPU
// downsample + tiny readback), keyed by layer id (stable across surface
// swaps). Mirrors state/thumbnails.ts.

import { writable } from 'svelte/store';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry, RegistryEvents } from '../core/document/registry';
import { rendererReady } from '../render/EditorRenderer';
import { renderLayerThumbnail } from '../render/thumbnail';

type LayerThumbMap = Record<string, string | undefined>;
export const layerThumbnails = writable<LayerThumbMap>({});

async function refreshDoc(doc: ImageDocument): Promise<void> {
	try {
		const renderer = await rendererReady;
		if (!documentRegistry.all.some((d) => d.id === doc.id)) return;
		const updates: LayerThumbMap = {};
		for (const layer of doc.layers) {
			const canvas = renderLayerThumbnail(renderer, doc, layer.surfaceId, 44);
			if (canvas) updates[layer.id] = canvas.toDataURL('image/png');
		}
		layerThumbnails.update((m) => {
			const next = { ...m, ...updates };
			// Prune entries whose layer no longer exists in any open document.
			const alive = new Set<string>();
			for (const d of documentRegistry.all) for (const l of d.layers) alive.add(l.id);
			for (const key of Object.keys(next)) if (!alive.has(key)) delete next[key];
			return next;
		});
	} catch {
		/* ignore thumbnail failures */
	}
}

// Coalesce re-renders (strokes happen often) to ~150ms after the last change.
const pending = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleRefresh(doc: ImageDocument): void {
	const prev = pending.get(doc.id);
	if (prev) clearTimeout(prev);
	pending.set(
		doc.id,
		setTimeout(() => {
			pending.delete(doc.id);
			void refreshDoc(doc);
		}, 150)
	);
}

let started = false;

/** Watches the registry and (re)generates layer previews. Safe to call once. */
export function startLayerThumbnails(): () => void {
	if (started) return () => {};
	started = true;

	const unsubs = [
		documentRegistry.events.on(RegistryEvents.opened, (d) => void refreshDoc(d as ImageDocument)),
		documentRegistry.events.on(RegistryEvents.changed, (d) => {
			const doc = d as ImageDocument | undefined;
			if (doc) scheduleRefresh(doc);
			else for (const dd of documentRegistry.all) scheduleRefresh(dd);
		}),
		documentRegistry.events.on(RegistryEvents.closed, (p) => {
			const id = (p as { id: string }).id;
			const t = pending.get(id);
			if (t) {
				clearTimeout(t);
				pending.delete(id);
			}
			layerThumbnails.update((m) => {
				const next = { ...m };
				const alive = new Set<string>();
				for (const dd of documentRegistry.all) for (const l of dd.layers) alive.add(l.id);
				for (const key of Object.keys(next)) if (!alive.has(key)) delete next[key];
				return next;
			});
		})
	];
	for (const doc of documentRegistry.all) void refreshDoc(doc);

	return () => {
		for (const t of pending.values()) clearTimeout(t);
		pending.clear();
		unsubs.forEach((u) => u());
	};
}
