// Layer: state (Svelte adapter). Holds small PNG previews per open document so
// tabs can show the image. Generated lazily (GPU downsample + tiny readback).

import { writable } from 'svelte/store';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry, RegistryEvents } from '../core/document/registry';
import { rendererReady } from '../render/EditorRenderer';
import { renderThumbnail } from '../render/thumbnail';

type ThumbMap = Record<string, string | undefined>;
export const thumbnails = writable<ThumbMap>({});

async function refresh(doc: ImageDocument): Promise<void> {
	try {
		const renderer = await rendererReady;
		const canvas = renderThumbnail(renderer, doc, 40);
		if (!canvas) return;
		thumbnails.update((m) => ({ ...m, [doc.id]: canvas.toDataURL('image/png') }));
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
			void refresh(doc);
		}, 150)
	);
}

let started = false;

/** Watches the registry and (re)generates thumbnails. Safe to call once. */
export function startThumbnails(): () => void {
	if (started) return () => {};
	started = true;

	const unsubs = [
		documentRegistry.events.on(RegistryEvents.opened, (d) => void refresh(d as ImageDocument)),
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
			thumbnails.update((m) => {
				const next = { ...m };
				delete next[id];
				return next;
			});
		})
	];
	for (const doc of documentRegistry.all) void refresh(doc);

	return () => {
		for (const t of pending.values()) clearTimeout(t);
		pending.clear();
		unsubs.forEach((u) => u());
	};
}
