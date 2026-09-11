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
//   every change and is cached, so a snapshot with the latest pixels is
//   usually ready by the time the user closes/reloads the tab. Runs are
//   strictly serialised (one at a time, FIFO) and a completed snapshot is
//   NEVER discarded: it publishes under the current version even if newer
//   events arrived mid-run, so rapid event streams can't starve the write.
// - The DB write itself is cheap and runs right after each completed
//   serialisation (plus a pagehide flush). It uses ONE readwrite transaction
//   (clear + puts), so a reload mid-write can never leave an empty store.
//
// IndexedDB transactions auto-commit when control returns to the event loop,
// so all transaction work is arranged synchronously after the async
// serialisation completes.

import { documentRegistry, RegistryEvents } from '../core/document/registry';
import { ImageDocument } from '../core/document/ImageDocument';
import { createRasterLayer, createTextLayer, type LayerEffect, type SurfaceId, type TextContent } from '../core/layers/Layer';
import { hasEditorRenderer, getEditorRenderer, rendererReady } from '../render/EditorRenderer';
import { surfaceToPngBlob } from '../render/export';
import { fitView } from '../render/Viewport';
import { effectById } from '../effects';
import type { EditorRenderer } from '../render/EditorRenderer';

const DB_NAME = 'paint.svelte';
const DB_VERSION = 3;
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
	/** Live (non-baked) layer effects, in chain order. Plain JSON data. */
	effects?: LayerEffect[];
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

/**
 * Opens the database at the canonical version. The upgrade handler ALWAYS
 * (re)creates the store so its shape matches this code exactly; if an older
 * build created a differently-shaped store (e.g. no key generator), the
 * upgrade re-creates it. As a belt-and-braces check the store shape is also
 * verified after opening, and a mismatch triggers a one-store bump that
 * forces the recreation.
 */
async function openDb(): Promise<IDBDatabase> {
	const db = await openVersion(DB_VERSION);
	if (db.objectStoreNames.contains(STORE)) {
		const meta = db.transaction(STORE, 'readonly').objectStore(STORE);
		if (meta.autoIncrement === true && !meta.keyPath) return db;
	}
	db.close();
	await openVersion(DB_VERSION + 1);
	return openVersion(DB_VERSION);
}

function openVersion(version: number): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, version);
		req.onupgradeneeded = () => {
			// Records are keyed by an auto-increment number so getAll() (which
			// returns records in key order) preserves the original tab order.
			const result = req.result;
			if (result.objectStoreNames.contains(STORE)) result.deleteObjectStore(STORE);
			result.createObjectStore(STORE, { autoIncrement: true });
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
		tx.onabort = () => reject(tx.error ?? new Error('The session write was aborted.'));
	});
}

/** Writes the whole snapshot atomically (clear + puts in ONE transaction). */
async function writeRecords(records: SavedDoc[]): Promise<void> {
	const db = await openDb();
	try {
		const tx = db.transaction(STORE, 'readwrite');
		const store = tx.objectStore(STORE);
		store.clear();
		for (const record of records) {
			const req = store.put(record);
			req.onerror = () => {
				if (typeof console !== 'undefined') {
					console.error(`[session] store.put failed for "${record.name}":`, req.error);
				}
			};
		}
		await txCompleted(tx);
	} finally {
		db.close();
	}
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
		if (layer.effects?.length) {
			saved.effects = layer.effects.map((e) => ({ id: e.id, settings: { ...e.settings }, enabled: e.enabled }));
		}
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
let lastRunError: string | null = null;

function schedulePrepare(): void {
	prepareChain = prepareChain.then(async () => {
		// Runs are strictly serialised by the chain, so at most one snapshot
		// is read back from the GPU at a time. Each run captures the registry
		// as it exists when it starts.
		try {
			const renderer = hasEditorRenderer() ? getEditorRenderer() : await rendererReady;
			const snapshot = await serializeAll(renderer);
			latestSerialized = snapshot;
			// Completed work is NEVER thrown away: label it with the version
			// the event stream has reached now, even if more events arrived
			// during capture. The old behaviour dropped the run when the
			// version changed mid-capture, so a rapid event stream superseded
			// the in-flight read-back before it finished and a freshly opened
			// doc never got written (the pipeline stayed at version 0).
			preparedVersion = dirtyVersion;
			scheduleWrite();
		} catch (err) {
			// Serialisation can fail transiently (context loss); a later event
			// re-triggers it. Logged so real-browser failures are visible.
			lastRunError = `${err instanceof Error ? err.message : String(err)}`;
			if (typeof console !== 'undefined') console.error('[session] serialisation failed:', err);
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
		.catch((err) => {
			// A write can fail transiently (quota, context); it is retried by
			// the next scheduleWrite/persistSession. Logged + exposed so
			// real-browser failures (e.g. Blob clone errors) are visible.
			lastRunError = `write failed: ${err instanceof Error ? err.message : String(err)}`;
			if (typeof console !== 'undefined') console.error('[session] write failed:', err);
		});
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
		// Schedule a serialisation for THIS version explicitly: the bump above
		// happens before scheduling, so the queued run is the freshest one (it
		// runs after any already-queued work and captures the latest state).
		schedulePrepare();
		const v = dirtyVersion;
		let guard = 0;
		while (preparedVersion < v && guard++ < 64) {
			await prepareChain;
		}
		await writePrepared();
		console.log(`[session] persist() done (version ${writtenVersion})`);
	};
	persistChain = persistChain.then(run);
	return persistChain;
}

// --- dev diagnostics hook --------------------------------------------------
//
// Poke these from the browser console without needing console.log spam:
//   window.__SESSION__.records()     -> what IndexedDB currently holds
//   window.__SESSION__.state()       -> pipeline counters + last error
//   window.__SESSION__.persistNow()  -> force a snapshot write now
//   window.__SESSION__.createNew()   -> open a fresh doc (like File>New)
export interface SessionDebug {
	records: () => Promise<SavedDoc[]>;
	state: () => {
		dirty: number;
		prepared: number;
		written: number;
		restoring: boolean;
		docs: number;
		writePending: boolean;
		lastError: string | null;
	};
	persistNow: () => Promise<void>;
	createNew: (req?: { width?: number; height?: number }) => Promise<boolean>;
}

function installDebugHook(): void {
	if (typeof window === 'undefined') return;
	const w = window as unknown as { __SESSION__?: SessionDebug };
	if (w.__SESSION__) return;
	w.__SESSION__ = {
		records: async () => {
			const db = await openDb();
			const recs = await getAll(db);
			db.close();
			return recs;
		},
		state: () => ({
			dirty: dirtyVersion,
			prepared: preparedVersion,
			written: writtenVersion,
			restoring,
			docs: documentRegistry.count,
			writePending: writeTimer !== null,
			lastError: lastRunError
		}),
		persistNow: () => persistSession(),
		createNew: async (req) => {
			const { createNewDocument } = await import('../services/fileService');
			return createNewDocument({
				width: req?.width ?? 800,
				height: req?.height ?? 600,
				background: 'transparent'
			});
		}
	};
}

/** Re-opens the documents stored by the previous session (if any). */
export async function restoreSession(): Promise<void> {
	if (typeof indexedDB === 'undefined') return;
	// Documents already in the registry means a prior restore (or an HMR
	// remount of the canvas component) already populated them; re-running
	// would duplicate them and can hit a renderer/surface-store mismatch.
	if (documentRegistry.count > 0) {
		restoring = false;
		return;
	}
	restoring = true;
	preparedVersion = dirtyVersion; // existing cached snapshots belong to the old session
	writtenVersion = dirtyVersion;
	try {
		const db = await openDb();
		const saved = await getAll(db);
		await writeRecords([]); // atomically empty the store; the rebuilt set is saved below
		db.close();
		console.log(`[session] restore: ${saved.length} saved document(s) found`);
		if (!saved.length) return;

		const renderer = await rendererReady;
		let lastActive: string | null = null;
		for (const record of saved) {
			const doc = await buildDoc(renderer, record);
			if (!doc) continue;
			documentRegistry.open(doc);
			if (record.active) lastActive = doc.id;
			console.log(`[session] restored "${doc.name}" (${doc.width}×${doc.height}, ${doc.layers.length} layer(s))`);
		}
		if (lastActive) documentRegistry.setActive(lastActive);
		// The restore rebuilt fresh documents (new ids); re-save the live set so
		// another reload in this session keeps working.
		if (documentRegistry.count > 0) await persistSession();
		console.log('[session] restore finished');
	} finally {
		restoring = false;
	}
}

/**
 * Validates saved layer effects (untrusted IndexedDB data): unknown effect
 * ids (e.g. removed in a newer build) are skipped, non-numeric settings are
 * dropped, and missing keys are filled from the effect defaults (filter
 * shaders read settings keys directly — a missing key would be NaN).
 */
function sanitizeEffects(raw: unknown): LayerEffect[] | undefined {
	if (!Array.isArray(raw)) return undefined;
	const out: LayerEffect[] = [];
	for (const e of raw) {
		if (!e || typeof e !== 'object') continue;
		const { id, settings, enabled } = e as { id: unknown; settings: unknown; enabled: unknown };
		if (typeof id !== 'string') continue;
		const def = effectById(id);
		if (!def) continue;
		if (!settings || typeof settings !== 'object' || Array.isArray(settings)) continue;
		const clean: Record<string, number> = { ...def.defaults };
		for (const [k, v] of Object.entries(settings)) {
			if (typeof v === 'number' && Number.isFinite(v)) clean[k] = v;
		}
		out.push({ id, settings: clean, enabled: enabled !== false });
	}
	return out.length ? out : undefined;
}

async function buildDoc(renderer: EditorRenderer, record: SavedDoc): Promise<ImageDocument | null> {
	if (record.width <= 0 || record.height <= 0 || record.layers.length === 0) return null;
	const v = { width: record.width, height: record.height };
	const max = 2 ** 26;
	if (v.width * v.height > max) return null;
	try {
		const restoredLayers = [];
		for (const layer of record.layers) {
			let surfaceId: SurfaceId;
			try {
				const bitmap = await createImageBitmap(layer.png);
				surfaceId = renderer.surfaces.createFromBitmap(bitmap);
				bitmap.close();
			} catch (err) {
				// A corrupt/unsupported layer blob should not sink the whole
				// document — fall back to a transparent surface so the doc
				// still opens.
				if (typeof console !== 'undefined')
					console.error('[session] failed to restore a layer bitmap; using empty surface:', err);
				surfaceId = renderer.surfaces.create(record.width, record.height);
			}
			if (layer.kind === 'text' && layer.text) {
				restoredLayers.push(createTextLayer(surfaceId, layer.name, layer.text));
			} else {
				restoredLayers.push(createRasterLayer(surfaceId, layer.name));
			}
			// Restored layers keep their visibility/opacity/blend/effects.
			const last = restoredLayers[restoredLayers.length - 1];
			last.visible = layer.visible;
			last.opacity = layer.opacity;
			last.blendMode = layer.blendMode;
			const effects = sanitizeEffects(layer.effects);
			if (effects) last.effects = effects;
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
	installDebugHook();
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
		// Best-effort flush. First write whatever snapshot is ALREADY freshly
		// serialised (no new GPU readbacks — those may not survive teardown),
		// then also try to serialise + write the very latest state.
		writePrepared();
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