// Layer: services. Session persistence (todo item 9): every open document is
// serialised to IndexedDB (metadata + one PNG blob per layer) and restored on
// the next launch, so closing/reloading the tab keeps your open tabs.
//
// A doc is stored only while it is open; closing a tab removes it from the
// snapshot. Saves are debounced on document change plus a background flush, and
// a final flush runs on pagehide.

import { documentRegistry, RegistryEvents } from '../core/document/registry';
import { ImageDocument } from '../core/document/ImageDocument';
import { createRasterLayer, createTextLayer, type TextContent } from '../core/layers/Layer';
import { hasEditorRenderer, getEditorRenderer, rendererReady } from '../render/EditorRenderer';
import { surfaceToPngBlob } from '../render/export';
import { fitView } from '../render/Viewport';
import type { EditorRenderer } from '../render/EditorRenderer';

const DB_NAME = 'paint.svelte';
const DB_VERSION = 2;
const STORE = 'documents';

interface SavedLayer {
	kind: 'raster' | 'text';
	name: string;
	visible: boolean;
	opacity: number;
	blendMode: string;
	png: Blob;
	text?: TextContent;
}

interface SavedDoc {
	id: string;
	name: string;
	width: number;
	height: number;
	activeLayerIndex: number;
	layers: SavedLayer[];
	active: boolean;
	dirty: boolean;
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
req.onupgradeneeded = () => {
		// Records are keyed by an auto-increment number so getAll() (which
		// returns records in key order) preserves the original tab order.
		if (req.result.objectStoreNames.contains(STORE)) req.result.deleteObjectStore(STORE);
		req.result.createObjectStore(STORE, { autoIncrement: true });
	};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('Could not open the session database.'));
	});
}

function getAll(db: IDBDatabase): Promise<SavedDoc[]> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).getAll();
		req.onsuccess = () => resolve((req.result as SavedDoc[]) ?? []);
		req.onerror = () => reject(req.error ?? new Error('Could not read saved sessions.'));
	});
}

function clearStore(db: IDBDatabase): Promise<void> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).clear();
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error('Could not clear saved sessions.'));
	});
}

function openTx(db: IDBDatabase): { store: IDBObjectStore; done: Promise<void> } {
	const tx = db.transaction(STORE, 'readwrite');
	return {
		store: tx.objectStore(STORE),
		done: new Promise((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error ?? new Error('Could not persist the session.'));
		})
	};
}

async function serializeDoc(renderer: EditorRenderer, doc: ImageDocument): Promise<SavedDoc> {
	const layers: SavedLayer[] = [];
	for (let i = 0; i < doc.layers.length; i++) {
		const layer = doc.layers[i];
		const png = await surfaceToPngBlob(renderer, layer.surfaceId, doc.width, doc.height);
		const saved: SavedLayer = {
			kind: layer.kind,
			name: layer.name,
			visible: layer.visible,
			opacity: layer.opacity,
			blendMode: layer.blendMode,
			png
		};
		if (layer.kind === 'text' && layer.text) saved.text = { ...layer.text, color: { ...layer.text.color } };
		layers.push(saved);
	}
	return {
		id: doc.id,
		name: doc.name,
		width: doc.width,
		height: doc.height,
		activeLayerIndex: Math.max(0, doc.indexOfLayer(doc.activeLayerId)),
		layers,
		active: documentRegistry.activeId === doc.id,
		dirty: doc.dirty
	};
}

// Serialises whole-session saves so concurrent calls (event-triggered, pagehide,
// restore) never interleave DB clear + writes.
let persistChain: Promise<void> = Promise.resolve();

/** Writes the current set of open documents to IndexedDB. */
export function persistSession(): Promise<void> {
	persistChain = persistChain.then(() => doPersist());
	return persistChain;
}

async function doPersist(): Promise<void> {
	if (typeof indexedDB === 'undefined') return;
	if (documentRegistry.count === 0) {
		await clearStore(await openDb());
		return;
	}
	const renderer = hasEditorRenderer() ? getEditorRenderer() : await rendererReady;
	// Serialize (async GPU readbacks) BEFORE opening the transaction: IDB
	// transactions auto-commit when control returns to the event loop.
	const pending: SavedDoc[] = [];
	for (const doc of documentRegistry.all) {
		pending.push(await serializeDoc(renderer, doc));
	}
	const db = await openDb();
	await clearStore(db);
	const tx = openTx(db);
	for (const record of pending) {
		tx.store.put(record);
	}
	await tx.done;
	db.close();
}

let restoring = false;

/** Re-opens the documents stored by the previous session (if any). */
export async function restoreSession(): Promise<void> {
	if (typeof indexedDB === 'undefined') return;
	restoring = true;
	try {
		const db = await openDb();
		const saved = await getAll(db);
		await clearStore(db);
		db.close();
		if (!saved.length) return;

		const renderer = await rendererReady;
		let lastActive: string | null = null;
		for (const record of saved) {
			const doc = await buildDoc(renderer, record);
			if (!doc) continue;
			documentRegistry.open(doc);
			if (record.active) lastActive = doc.id;
		}
		if (lastActive) documentRegistry.setActive(lastActive);
		// The restore rebuilt fresh documents (new ids); re-save the live set so
		// another reload in this session keeps working.
		if (documentRegistry.count > 0) await persistSession();
	} finally {
		restoring = false;
	}
}

async function buildDoc(renderer: EditorRenderer, record: SavedDoc): Promise<ImageDocument | null> {
	if (record.width <= 0 || record.height <= 0 || record.layers.length === 0) return null;
	const v = { width: record.width, height: record.height };
	const max = 2 ** 26;
	if (v.width * v.height > max) return null;
	try {
		const restoredLayers = [];
		for (const layer of record.layers) {
			const bitmap = await createImageBitmap(layer.png);
			const surfaceId = renderer.surfaces.createFromBitmap(bitmap);
			bitmap.close();
			if (layer.kind === 'text' && layer.text) {
				restoredLayers.push(createTextLayer(surfaceId, layer.name, layer.text));
			} else {
				restoredLayers.push(createRasterLayer(surfaceId, layer.name));
			}
			// Restored layers keep their visibility/opacity/blend.
			const last = restoredLayers[restoredLayers.length - 1];
			last.visible = layer.visible;
			last.opacity = layer.opacity;
			last.blendMode = layer.blendMode;
		}

		const doc = new ImageDocument({
			name: record.name || 'Restored Document',
			width: record.width,
			height: record.height,
			surfaceId: restoredLayers[0].surfaceId,
			view: fitView(record.width, record.height, renderer.viewWidth, renderer.viewHeight)
		});
		doc.layers = restoredLayers;
		doc.activeLayerId = restoredLayers[Math.min(record.activeLayerIndex, restoredLayers.length - 1)].id;
		doc.setDirty(record.dirty);
		return doc;
	} catch {
		return null;
	}
}

export interface SessionPersistence {
	stop: () => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(): void {
	if (restoring || persistTimer) return;
	persistTimer = setTimeout(() => {
		persistTimer = null;
		void persistSession();
	}, 1200);
}

/** Wires document events to debounced persistence. Returns a cleanup function. */
export function startSessionPersistence(): SessionPersistence {
	const onEvent = () => schedulePersist();
	const onOpen = () => {
		// A freshly opened tab should survive an immediate reload, so save it
		// right away (no debounce). The persist queue serialises this with any
		// in-flight save.
		void persistSession();
	};
	documentRegistry.events.on(RegistryEvents.opened, onOpen);
	documentRegistry.events.on(RegistryEvents.closed, onEvent);
	documentRegistry.events.on(RegistryEvents.changed, onEvent);
	documentRegistry.events.on(RegistryEvents.active, onEvent);

	const background = setInterval(() => {
		if (persistTimer) {
			clearTimeout(persistTimer);
			persistTimer = null;
			void persistSession();
		}
	}, 5000);

	const onPageHide = () => {
		if (persistTimer) {
			clearTimeout(persistTimer);
			persistTimer = null;
		}
		void persistSession();
	};
	window.addEventListener('pagehide', onPageHide);

	return {
		stop: () => {
			documentRegistry.events.off(RegistryEvents.opened, onOpen);
			documentRegistry.events.off(RegistryEvents.closed, onEvent);
			documentRegistry.events.off(RegistryEvents.changed, onEvent);
			documentRegistry.events.off(RegistryEvents.active, onEvent);
			clearInterval(background);
			window.removeEventListener('pagehide', onPageHide);
			if (persistTimer) {
				clearTimeout(persistTimer);
				persistTimer = null;
			}
		}
	};
}