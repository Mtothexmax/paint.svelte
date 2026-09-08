// Layer: services. Session persistence (todo item 9): every open document is
// serialised to IndexedDB (metadata + one PNG blob per layer) and restored on
// the next launch, so closing/reloading the tab keeps your open tabs.
//
// A doc is stored only while it is open; closing a tab removes it from the
// snapshot.
//
// Reliability model
// ----------------
// - Serialisation (slow: GPU readbacks + PNG encode) starts IMMEDIATELY on
//   every change and is cached; superseded runs are dropped. This means a
//   snapshot with the latest pixels is usually ready by the time the user
//   closes/reloads the tab, instead of only being started after a debounce.
// - The DB write itself is cheap and runs right after each completed
//   serialisation (plus a pagehide flush). It uses ONE readwrite transaction
//   (clear + puts), so a reload mid-write can never leave an empty store.
//
// IndexedDB transactions auto-commit when control returns to the event loop,
// so all transaction work is arranged synchronously after the async
// serialisation completes.

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

const WRITE_DEBOUNCE_MS = 350;

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

function txCompleted(tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error('Could not persist the session.'));
	});
}

/** Writes the whole snapshot atomically (clear + puts in ONE transaction). */
async function writeRecords(records: SavedDoc[]): Promise<void> {
	const db = await openDb();
	const tx = db.transaction(STORE, 'readwrite');
	const store = tx.objectStore(STORE);
	store.clear();
	for (const record of records) {
		store.put(record);
	}
	await txCompleted(tx);
	db.close();
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

async function serializeAll(renderer: EditorRenderer): Promise<SavedDoc[]> {
	if (documentRegistry.count === 0) return [];
	const pending: SavedDoc[] = [];
	for (const doc of documentRegistry.all) {
		pending.push(await serializeDoc(renderer, doc));
	}
	return pending;
}

// --- snapshot pipeline -----------------------------------------------------
//
// dirtyVersion: bumps on every session-affecting event.
// preparedVersion: the version whose serialisation is currently cached.
// writtenVersion: the version currently in the DB.
// latestSerialized: the freshest completed snapshot.

let dirtyVersion = 0;
let preparedVersion = 0;
let writtenVersion = 0;
let latestSerialized: SavedDoc[] | null = null;
let prepareChain: Promise<void> = Promise.resolve();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let restoring = false;

function schedulePrepare(): void {
	const v = dirtyVersion;
	prepareChain = prepareChain.then(async () => {
		if (v !== dirtyVersion) return; // superseded before this run even started
		try {
			const renderer = hasEditorRenderer() ? getEditorRenderer() : await rendererReady;
			const snapshot = await serializeAll(renderer);
			if (v !== dirtyVersion) return; // superseded mid-flight — drop it
			latestSerialized = snapshot;
			preparedVersion = v;
			scheduleWrite();
		} catch {
			// Serialisation can fail transiently (context loss); a later event
			// re-triggers it. Ignored.
		}
	});
}

/** Debounces DB writes so rapid edits don't hammer IndexedDB. */
function scheduleWrite(): void {
	if (writeTimer) clearTimeout(writeTimer);
	writeTimer = setTimeout(() => void writePrepared(), WRITE_DEBOUNCE_MS);
}

let writeChain: Promise<void> = Promise.resolve();

function writePrepared(): Promise<void> {
	if (writeTimer) {
		clearTimeout(writeTimer);
		writeTimer = null;
	}
	const v = preparedVersion;
	if (v <= writtenVersion) return Promise.resolve();
	const snapshot = latestSerialized;
	if (!snapshot) return Promise.resolve();
	writeChain = writeChain
		.then(() => writeRecords(snapshot))
		.then(() => {
			if (v > writtenVersion) writtenVersion = v;
		})
		.catch(() => undefined);
	return writeChain;
}

/** Marks the session dirty and starts the background snapshot pipeline. */
function markSessionDirty(): void {
	dirtyVersion++;
	schedulePrepare();
}

/**
 * Forces a write of the freshest possible snapshot: bumps the version, waits
 * until it is serialised, then writes immediately. Used on open (so a fresh
 * tab survives a quick reload) and on pagehide (best-effort flush).
 */
let persistChain: Promise<void> = Promise.resolve();

export function persistSession(): Promise<void> {
	const run = async () => {
		dirtyVersion++;
		const v = dirtyVersion;
		let guard = 0;
		while (preparedVersion < v && guard++ < 64) {
			await prepareChain;
		}
		await writePrepared();
	};
	persistChain = persistChain.then(run);
	return persistChain;
}

// --- restore ---------------------------------------------------------------

/** Re-opens the documents stored by the previous session (if any). */
export async function restoreSession(): Promise<void> {
	if (typeof indexedDB === 'undefined') return;
	restoring = true;
	preparedVersion = dirtyVersion; // existing cached snapshots belong to the old session
	writtenVersion = dirtyVersion;
	try {
		const db = await openDb();
		const saved = await getAll(db);
		await writeRecords([]); // atomically empty the store; the rebuilt set is saved below
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

/** Wires document events to the snapshot pipeline. Returns a cleanup function. */
export function startSessionPersistence(): SessionPersistence {
	const mark = () => markSessionDirty();
	const onOpen = () => {
		// A freshly opened tab should survive an immediate reload: start the
		// snapshot right away and force a write once it is ready.
		markSessionDirty();
		void persistSession();
	};
	documentRegistry.events.on(RegistryEvents.opened, onOpen);
	documentRegistry.events.on(RegistryEvents.closed, mark);
	documentRegistry.events.on(RegistryEvents.changed, mark);
	documentRegistry.events.on(RegistryEvents.active, mark);

	const onPageHide = () => {
		void persistSession();
	};
	window.addEventListener('pagehide', onPageHide);

	return {
		stop: () => {
			documentRegistry.events.off(RegistryEvents.opened, onOpen);
			documentRegistry.events.off(RegistryEvents.closed, mark);
			documentRegistry.events.off(RegistryEvents.changed, mark);
			documentRegistry.events.off(RegistryEvents.active, mark);
			window.removeEventListener('pagehide', onPageHide);
			if (writeTimer) {
				clearTimeout(writeTimer);
				writeTimer = null;
			}
		}
	};
}