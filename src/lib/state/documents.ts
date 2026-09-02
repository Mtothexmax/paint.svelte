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
