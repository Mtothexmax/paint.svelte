// Layer: ai. Downloads (with progress), verifies, caches, and instantiates
// BiRefNet Lite ONNX sessions via ONNX Runtime Web. UI-free: progress flows
// out through callbacks; all errors surface as BackgroundRemovalError.
//
// Static-deployment notes:
// - The ORT WASM binaries ship inside the `onnxruntime-web` npm package (NOT
//   in git) and are bundled via `?url` imports, so they land in the build
//   output with correct base paths. `ort.env.wasm.wasmPaths` is pointed at
//   that directory — otherwise ORT would fetch them from a CDN at runtime.
// - WASM multi-threading needs SharedArrayBuffer (COOP/COEP headers), which a
//   static host cannot guarantee. Without `crossOriginIsolated` we pin
//   `numThreads = 1` and skip the proxy worker.

import * as ort from 'onnxruntime-web';
import type { InferenceSession } from 'onnxruntime-web';
import { MODELS, modelUrl, type PinnedModel } from './models';
import { getCachedModel, putCachedModel, pruneStaleRevisions } from './cache';
import { rewriteGatherNdForWebGpu } from './graph-rewrite';
import { BackgroundRemovalError, type BackgroundRemovalQuality, type InferenceBackend } from './types';

// WASM runtimes bundled from the npm package (emitted into the build output,
// never committed to git, never fetched from a CDN at runtime).
import wasmThreadedUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import wasmJsepUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';
import wasmJspiUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jspi.wasm?url';
import wasmAsyncifyUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';

function wasmPaths(): string {
	// All four artifacts live in the same output directory; any one derives it.
	const i = wasmThreadedUrl.lastIndexOf('/');
	return i >= 0 ? wasmThreadedUrl.slice(0, i + 1) : './';
}

// Reference every bundled artifact so Vite emits all of them (ORT fetches
// only what the active execution provider needs).
const BUNDLED_WASM = [wasmThreadedUrl, wasmJsepUrl, wasmJspiUrl, wasmAsyncifyUrl];

let wasmConfigured = false;
function configureWasm(): void {
	if (wasmConfigured) return;
	wasmConfigured = true;
	void BUNDLED_WASM.length;
	// Pinned in every debug transcript: exact runtime build matters for
	// WebGPU shader-compat archaeology (e.g. 1.30.0 vs 1.31.0-dev).
	const ortVersion: string =
		typeof (ort.env as { versions?: { web?: unknown } }).versions?.web === 'string'
			? (ort.env as { versions: { web: string } }).versions.web
			: 'unknown';
	console.debug(`[bg-removal] onnxruntime-web ${ortVersion}`);
	ort.env.wasm.wasmPaths = wasmPaths();
	if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
		// No SharedArrayBuffer without COOP/COEP (static hosting): run the
		// WASM backend single-threaded instead of failing or hanging.
		ort.env.wasm.numThreads = 1;
		ort.env.wasm.proxy = false;
	}
}

export interface BackendInfo {
	backend: InferenceBackend;
	webgpuAvailable: boolean;
	/** Adapter's maxStorageBuffersPerShaderStage (null when unknown). */
	maxStorageBuffers: number | null;
	/** True when the 1024 graph is expected to compile on this adapter. */
	highQualitySupported: boolean;
	note: string | null;
}

let backendCache: BackendInfo | null = null;

/** Detects the usable backend without creating a session. Cheap and cached.
 * Hidden override for support/testing: localStorage `paint.ai.backendForce`
 * = 'wasm' forces the CPU path even when WebGPU exists. */
export async function detectBackend(): Promise<BackendInfo> {
	if (backendCache) return backendCache;
	let forcedWasm = false;
	try {
		forcedWasm = localStorage.getItem('paint.ai.backendForce') === 'wasm';
	} catch {
		/* storage unavailable — ignore */
	}
	const gpu = !forcedWasm && typeof navigator !== 'undefined' ? navigator.gpu : undefined;
	if (!gpu) {
		backendCache = {
			backend: 'wasm',
			webgpuAvailable: false,
			maxStorageBuffers: null,
			highQualitySupported: false,
			note: 'WebGPU is unavailable in this browser — the CPU fallback is much slower.'
		};
		return backendCache;
	}
	try {
		const adapter = await gpu.requestAdapter();
		if (!adapter) throw new Error('no adapter');
	 const maxStorageBuffers = adapter.limits.maxStorageBuffersPerShaderStage ?? null;
		// The 1024 graph needs >= 8 storage buffers per shader stage.
		const highQualitySupported = maxStorageBuffers === null || maxStorageBuffers >= 8;
		backendCache = {
			backend: 'webgpu',
			webgpuAvailable: true,
			maxStorageBuffers,
			highQualitySupported,
			note: null
		};
		return backendCache;
	} catch {
		backendCache = {
			backend: 'wasm',
			webgpuAvailable: false,
			maxStorageBuffers: null,
			highQualitySupported: false,
			note: 'WebGPU initialisation failed — the CPU fallback is much slower.'
		};
		return backendCache;
	}
}

export interface DownloadProgress {
	loadedBytes: number;
	totalBytes: number | null;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Fetches model bytes with byte progress. Throws on abort/HTTP errors. */
export async function downloadModelBytes(
	model: PinnedModel,
	onProgress: (p: DownloadProgress) => void,
	signal: AbortSignal
): Promise<ArrayBuffer> {
	let res: Response;
	try {
		res = await fetch(modelUrl(model), { signal });
	} catch (err) {
		if (signal.aborted) throw new BackgroundRemovalError('aborted', 'Model download was cancelled.');
		throw new BackgroundRemovalError(
			'download-failed',
			`Could not reach Hugging Face (${err instanceof Error ? err.message : 'network error'}). Check the connection and retry.`
		);
	}
	if (!res.ok || !res.body) {
		throw new BackgroundRemovalError(
			'download-failed',
			`Model download failed (HTTP ${res.status}). Retry, or check the Hugging Face status page.`
		);
	}
	const headerTotal = Number(res.headers.get('content-length'));
	const total = Number.isFinite(headerTotal) && headerTotal > 0 ? headerTotal : model.byteSize;
	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];
	let loaded = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (signal.aborted) {
			try {
				await reader.cancel();
			} catch {
				/* ignore */
			}
			throw new BackgroundRemovalError('aborted', 'Model download was cancelled.');
		}
		if (done) break;
		if (value) {
			chunks.push(value);
			loaded += value.byteLength;
			onProgress({ loadedBytes: loaded, totalBytes: total });
		}
	}
	const bytes = new Uint8Array(loaded);
	let off = 0;
	for (const c of chunks) {
		bytes.set(c, off);
		off += c.byteLength;
	}
	if (bytes.byteLength !== model.byteSize) {
		throw new BackgroundRemovalError(
			'download-failed',
			`Downloaded ${bytes.byteLength} bytes but expected ${model.byteSize} — the file changed upstream. Aborted safely; retry to fetch the pinned revision.`
		);
	}
	return bytes.buffer as ArrayBuffer;
}

/** Returns model bytes, preferring the exact-revision IndexedDB entry. The
 * `fromCache` flag lets the UI say "loading cached model" vs "downloading".
 * Cached entries already carry the WebGPU graph rewrite; fresh downloads get
 * it applied here, before caching (see graph-rewrite.ts). */
export async function ensureModelBytes(
	quality: BackgroundRemovalQuality,
	onProgress: (p: DownloadProgress) => void,
	signal: AbortSignal,
	onCacheHit?: () => void
): Promise<{ bytes: ArrayBuffer; fromCache: boolean }> {
	const model = MODELS[quality];
	const cached = await getCachedModel(model);
	if (cached) {
		onCacheHit?.();
		return { bytes: cached, fromCache: true };
	}
	const bytes = await downloadModelBytes(model, onProgress, signal);
	if (model.sha256) {
		const actual = await sha256Hex(bytes);
		if (actual !== model.sha256) {
			throw new BackgroundRemovalError(
				'integrity-mismatch',
				'Downloaded model failed its checksum — not stored, not used. Retry the download.'
			);
		}
	}
	let rewritten: ArrayBuffer;
	try {
		const t0 = performance.now();
		const { bytes: fixed, replacedCount } = rewriteGatherNdForWebGpu(bytes);
		rewritten = fixed;
		console.debug(
			`[bg-removal] graph rewrite: ${replacedCount} GatherND replaced ` +
				`(${bytes.byteLength} -> ${fixed.byteLength} bytes, ${Math.round(performance.now() - t0)} ms)`
		);
	} catch (err) {
		throw new BackgroundRemovalError(
			'session-failed',
			`Downloaded model failed the WebGPU compatibility rewrite (${err instanceof Error ? err.message : 'unknown error'}). Not stored, not used.`
		);
	}
	try {
		await putCachedModel(model, rewritten, bytes.byteLength);
	} catch {
		/* caching is best-effort; the bytes still work for this session */
	}
	void pruneStaleRevisions(model);
	return { bytes: rewritten, fromCache: false };
}

export interface LoadedSession {
	session: InferenceSession;
	backend: InferenceBackend;
	inputName: string;
	inputSize: number;
	quality: BackgroundRemovalQuality;
}

// Only one graph resident at a time (the 1024 card explicitly warns against
// two). Keyed so switching quality disposes the previous session.
let resident: LoadedSession | null = null;

function disposeResident(): void {
	if (!resident) return;
	try {
		resident.session.release();
	} catch {
		/* ignore */
	}
	resident = null;
}

/**
 * Creates (or reuses) an inference session for the requested quality.
 * Prefers WebGPU; falls back to WASM where the model allows it (the 1024
 * graph cannot run on WASM — its intermediates exceed the WASM heap — so a
 * missing WebGPU there is a clean error, not a silent hang).
 */
export async function ensureSession(
	quality: BackgroundRemovalQuality,
	bytes: ArrayBuffer,
	backend: InferenceBackend
): Promise<LoadedSession> {
	if (resident && resident.quality === quality && resident.backend === backend) return resident;
	// Fresh-session discipline: the previous session (possibly a WebGPU one
	// that emitted hundreds of validation errors) is fully released BEFORE
	// the new session is created. There is no broader ORT reset API — but
	// session.release() is the complete cleanup, and CPU results after a
	// failed WebGPU run are bit-identical to pure-CPU runs (verified live).
	disposeResident();
	configureWasm();

	const tryCreate = async (ep: InferenceBackend): Promise<InferenceSession> => {
		try {
			return await ort.InferenceSession.create(bytes, {
				executionProviders: [ep],
				graphOptimizationLevel: 'all'
			});
		} catch (err) {
			throw new BackgroundRemovalError(
				'session-failed',
				ep === 'webgpu'
					? `Could not start the model on WebGPU (${err instanceof Error ? err.message : 'unknown error'}).`
					: `Could not start the model on the CPU fallback. The fp16 graph needs WebGPU on this device (${err instanceof Error ? err.message : 'unknown error'}).`
			);
		}
	};

	const model = MODELS[quality];
	if (backend === 'webgpu') {
		const session = await tryCreate('webgpu');
		const inputName = session.inputNames[0] ?? 'input_image';
		resident = { session, backend: 'webgpu', inputName, inputSize: model.inputSize, quality };
		return resident;
	}
	// WASM path: only the 512 graph is even attempted.
	if (model.requiresWebGpu) {
		throw new BackgroundRemovalError(
			'no-webgpu',
			'High quality needs WebGPU, which this browser does not provide — the 1024 graph cannot fit the CPU memory budget. Use Balanced instead.'
		);
	}
	const session = await tryCreate('wasm');
	const inputName = session.inputNames[0] ?? 'input_image';
	resident = { session, backend: 'wasm', inputName, inputSize: model.inputSize, quality };
	return resident;
}

/** Releases the resident session (quality switch, dialog teardown). */
export function releaseSession(): void {
	disposeResident();
}
