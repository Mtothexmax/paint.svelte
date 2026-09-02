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

let started = false;

/** Watches the registry and (re)generates thumbnails. Safe to call once. */
export function startThumbnails(): () => void {
	if (started) return () => {};
	started = true;

	const unsubs = [
		documentRegistry.events.on(RegistryEvents.opened, (d) => void refresh(d as ImageDocument)),
		documentRegistry.events.on(RegistryEvents.closed, (p) => {
			const id = (p as { id: string }).id;
			thumbnails.update((m) => {
				const next = { ...m };
				delete next[id];
				return next;
			});
		})
	];
	for (const doc of documentRegistry.all) void refresh(doc);

	return () => unsubs.forEach((u) => u());
}
