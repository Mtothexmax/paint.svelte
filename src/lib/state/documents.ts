// Layer: state (Svelte adapter). Exposes an immutable snapshot store of the
// open documents + active id, translated from DocumentRegistry domain events.

import { readable } from 'svelte/store';
import type { DocId } from '../core/document/ImageDocument';
import { documentRegistry, RegistryEvents } from '../core/document/registry';

export interface DocMeta {
	id: DocId;
	name: string;
	width: number;
	height: number;
	dirty: boolean;
}

export interface DocumentsSnapshot {
	docs: DocMeta[];
	activeId: DocId | null;
}

function buildSnapshot(): DocumentsSnapshot {
	return {
		docs: documentRegistry.all.map((doc) => ({
			id: doc.id,
			name: doc.name,
			width: doc.width,
			height: doc.height,
			dirty: doc.dirty
		})),
		activeId: documentRegistry.activeId
	};
}

/** Read-only snapshot store kept in sync with the registry. */
export const documents = readable<DocumentsSnapshot>(buildSnapshot(), (set) => {
	const sync = () => set(buildSnapshot());
	const unsubs = [
		documentRegistry.events.on(RegistryEvents.opened, sync),
		documentRegistry.events.on(RegistryEvents.closed, sync),
		documentRegistry.events.on(RegistryEvents.active, sync),
		documentRegistry.events.on(RegistryEvents.changed, sync)
	];
	sync();
	return () => unsubs.forEach((u) => u());
});

/** True while the active document has a live selection. Re-emits on every
 * registry change (selection edits notify via `touch`), so UI like the
 * "Crop to Selection" button can react to selection state directly. */
export const selectionActive = readable<boolean>(false, (set) => {
	const sync = () => set(!!documentRegistry.active?.selection.active);
	const unsubs = [
		documentRegistry.events.on(RegistryEvents.opened, sync),
		documentRegistry.events.on(RegistryEvents.closed, sync),
		documentRegistry.events.on(RegistryEvents.active, sync),
		documentRegistry.events.on(RegistryEvents.changed, sync)
	];
	sync();
	return () => unsubs.forEach((u) => u());
});

/** True while the ACTIVE LAYER of the active document is a text layer.
 * Drives the "Render Layer to Raster Layer" hint and the paint guard. */
export const activeLayerIsText = readable<boolean>(false, (set) => {
	const sync = () => {
		const doc = documentRegistry.active;
		if (!doc) return set(false);
		const layer = doc.layers.find((l) => l.id === doc.activeLayerId);
		set(!!layer && layer.kind === 'text');
	};
	const unsubs = [
		documentRegistry.events.on(RegistryEvents.opened, sync),
		documentRegistry.events.on(RegistryEvents.closed, sync),
		documentRegistry.events.on(RegistryEvents.active, sync),
		documentRegistry.events.on(RegistryEvents.changed, sync)
	];
	sync();
	return () => unsubs.forEach((u) => u());
});

/** Selection bounding size (W×H in px) of the active document, or null. */
export const selectionSize = readable<{ w: number; h: number } | null>(null, (set) => {
	const sync = () => {
		const sel = documentRegistry.active?.selection;
		if (sel?.active && sel.bounds) {
			set({
				w: Math.max(1, Math.round(sel.bounds.width)),
				h: Math.max(1, Math.round(sel.bounds.height))
			});
		} else {
			set(null);
		}
	};
	const unsubs = [
		documentRegistry.events.on(RegistryEvents.opened, sync),
		documentRegistry.events.on(RegistryEvents.closed, sync),
		documentRegistry.events.on(RegistryEvents.active, sync),
		documentRegistry.events.on(RegistryEvents.changed, sync)
	];
	sync();
	return () => unsubs.forEach((u) => u());
});
