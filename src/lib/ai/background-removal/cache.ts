// Layer: ai. Persistent local cache for downloaded model weights (IndexedDB).
// Deliberately NOT the HTTP cache: entries are keyed by the exact pinned
// revision, survive eviction policies differently, and can be pruned when the
// registry moves to a new revision. User images are never stored here.

import type { PinnedModel } from './models';

const DB_NAME = 'paint-ai-cache';
const DB_VERSION = 1;
const STORE = 'ai-models';

interface CacheRecord {
	key: string;
	bytes: ArrayBuffer;
	byteSize: number;
	sha256: string | null;
	savedAt: number;
	/** Graph-rewrite variant that produced `bytes` (missing = pre-rewrite). */
	variant?: string;
	/** Original download size before the rewrite (provenance only). */
	sourceByteSize?: number;
}

/** Bumped whenever the load-time graph rewrite changes: old entries (which
 * hold unpatched, WebGPU-hostile bytes) miss and are pruned, never read. */
export const TRANSFORM_VARIANT = 'ortweb-gathernd-v1';

/** Cache key binds repo + revision + file + rewrite variant, so a revision
 * bump OR a rewrite change automatically misses (and orphans) older entries. */
export function cacheKeyFor(model: PinnedModel): string {
	return `bg-removal/${model.repo}@${model.revision}/${model.file}/${TRANSFORM_VARIANT}`;
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('IndexedDB is unavailable.'));
			return;
		}
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE)) {
				req.result.createObjectStore(STORE, { keyPath: 'key' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('Failed to open model cache.'));
	});
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		const t = db.transaction(STORE, mode);
		const req = fn(t.objectStore(STORE));
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('Model cache transaction failed.'));
	});
}

/** Lightweight existence check for the EXACT pinned revision — uses
 * `count()` so multi-megabyte values are never materialized. The loader
 * re-validates byte size when it actually reads the entry. */
export async function hasCachedModel(model: PinnedModel): Promise<boolean> {
	const key = cacheKeyFor(model);
	let db: IDBDatabase;
	try {
		db = await openDb();
	} catch {
		return false;
	}
	try {
		const n = await tx<number>(db, 'readonly', (s) => s.count(key));
		return n > 0;
	} catch {
		return false;
	} finally {
		db.close();
	}
}

/** Returns cached TRANSFORMED bytes for the exact pinned revision, or null.
 * Pre-rewrite entries (no variant) are treated as misses. */
export async function getCachedModel(model: PinnedModel): Promise<ArrayBuffer | null> {	const key = cacheKeyFor(model);
	let db: IDBDatabase;
	try {
		db = await openDb();
	} catch {
		return null;
	}
	try {
		const rec = await tx<CacheRecord | undefined>(db, 'readonly', (s) => s.get(key));
		if (!rec || !(rec.bytes instanceof ArrayBuffer) || rec.bytes.byteLength === 0) return null;
		// Only rewritten entries are valid; the transformed size is whatever
		// the rewrite produced (self-consistency, not the registry size —
		// integrity was verified at download time, before the rewrite).
		if (rec.variant !== TRANSFORM_VARIANT || rec.byteSize !== rec.bytes.byteLength) return null;
		return rec.bytes;
	} catch {
		return null;
	} finally {
		db.close();
	}
}

/** Persists TRANSFORMED bytes under the pinned-revision + variant key. */
export async function putCachedModel(
	model: PinnedModel,
	bytes: ArrayBuffer,
	sourceByteSize: number
): Promise<void> {
	const db = await openDb();
	try {
		const rec: CacheRecord = {
			key: cacheKeyFor(model),
			bytes,
			byteSize: bytes.byteLength,
			sha256: null,
			savedAt: Date.now(),
			variant: TRANSFORM_VARIANT,
			sourceByteSize
		};
		await tx(db, 'readwrite', (s) => s.put(rec));
	} finally {
		db.close();
	}
}

/** Deletes entries for the same repo/file that are NOT the current pinned
 * revision (e.g. after the registry moves). Keeps the current key. */
export async function pruneStaleRevisions(model: PinnedModel): Promise<void> {
	const keep = cacheKeyFor(model);
	const prefix = `bg-removal/${model.repo}@`;
	let db: IDBDatabase;
	try {
		db = await openDb();
	} catch {
		return;
	}
	try {
		const keys = await tx<IDBValidKey[]>(db, 'readonly', (s) => s.getAllKeys());
		const stale = (keys as string[]).filter(
			(k) => typeof k === 'string' && k.startsWith(prefix) && k !== keep
		);
		if (!stale.length) return;
		await new Promise<void>((resolve, reject) => {
			const t = db.transaction(STORE, 'readwrite');
			const store = t.objectStore(STORE);
			for (const k of stale) store.delete(k);
			t.oncomplete = () => resolve();
			t.onerror = () => reject(t.error ?? new Error('Failed to prune model cache.'));
		});
	} catch {
		/* pruning is best-effort */
	} finally {
		db.close();
	}
}
