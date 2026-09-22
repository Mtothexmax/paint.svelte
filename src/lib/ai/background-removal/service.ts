// Layer: ai (app bridge). Runs background removal on a document layer and
// commits the cutout as a NEW layer above the source — the original layer is
// never modified (non-destructive, undoable via the standard history).
//
// Data flow (no parallel image-editing system; everything reuses existing
// abstractions):
//   layer pixels: renderer.exportTextureFor(layer) → extractStraightCanvas
//   result pixels: canvas → createImageBitmap → surfaces.createFromBitmap
//   layer insert: doc.insertLayer + history entry (mirrors the paste path)

import { documentRegistry } from '../../core/document/registry';
import { createRasterLayer } from '../../core/layers/Layer';
import { getEditorRenderer } from '../../render/EditorRenderer';
import { extractStraightCanvas } from '../../render/readback';
import { cancelFloatingMove } from '../../state/moveTransform';
import { showNotice } from '../../state/ui';
import { MODELS } from './models';
import { ensureModelBytes, ensureSession, detectBackend } from './model-loader';
import { runMatting } from './inference';
import {
	BackgroundRemovalError,
	type BackgroundRemovalQuality,
	type DebugCallback,
	type InferenceBackend,
	type MatteResult,
	type ProgressCallback
} from './types';

export interface RemoveBackgroundOptions {
	quality: BackgroundRemovalQuality;
	onProgress: ProgressCallback;
	/** Aborts the download; in-flight inference results are discarded. */
	signal?: AbortSignal;
	/** When true, the caller no longer wants the result (dialog closed). */
	isStale?: () => boolean;
	/** Receives one diagnostic snapshot per inference pass (input/logit/matte stats). */
	onDebug?: DebugCallback;
	/** Skips backend auto-detection (e.g. CPU retry after a suspect GPU run). */
	backendOverride?: InferenceBackend;
}

function throwIfStale(isStale?: () => boolean): void {
	if (isStale?.()) throw new BackgroundRemovalError('aborted', 'Cancelled.');
}

async function readSourceCanvas(layerId: string): Promise<{ canvas: HTMLCanvasElement; layerName: string; width: number; height: number }> {
	const doc = documentRegistry.active;
	if (!doc) throw new BackgroundRemovalError('empty-source', 'No document is open.');
	const layer = doc.layers.find((l) => l.id === layerId) ?? doc.activeLayer;
	if (!layer) throw new BackgroundRemovalError('empty-source', 'No layer is selected.');
	const renderer = getEditorRenderer();
	if (!renderer.surfaces.has(layer.surfaceId)) {
		throw new BackgroundRemovalError('empty-source', 'The source layer has no pixels.');
	}
	// Live effects included: the matte matches what the canvas shows.
	const tex = renderer.exportTextureFor(layer) ?? renderer.surfaces.getTexture(layer.surfaceId);
	if (!tex) throw new BackgroundRemovalError('empty-source', 'Could not read the source layer.');
	const canvas = extractStraightCanvas(renderer, tex);
	return { canvas, layerName: layer.name, width: canvas.width, height: canvas.height };
}

function commitCutoutLayer(bitmap: ImageBitmap, sourceLayerId: string, backend: InferenceBackend): void {
	const doc = documentRegistry.active;
	if (!doc) {
		bitmap.close();
		return;
	}
	cancelFloatingMove();
	const renderer = getEditorRenderer();
	const surfaceId = renderer.surfaces.createFromBitmap(bitmap);
	bitmap.close();
	const w = doc.width;
	const h = doc.height;
	const layer = createRasterLayer(surfaceId, 'Background Removed');
	const srcIndex = doc.indexOfLayer(sourceLayerId);
	const index = srcIndex >= 0 ? srcIndex + 1 : doc.layers.length;
	const prevActive = doc.activeLayerId;

	doc.insertLayer(layer, index);
	doc.setActiveLayer(layer.id);
	renderer.rebuildActiveLayers();
	doc.setDirty(true);
	documentRegistry.notifyChange(doc);

	doc.history.push({
		label: `Remove Background (${backend === 'webgpu' ? 'WebGPU' : 'CPU'})`,
		memoryBytes: w * h * 4 * 2,
		undo: () => {
			doc.removeLayer(layer.id);
			if (doc.layers.some((l) => l.id === prevActive)) doc.setActiveLayer(prevActive);
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		redo: () => {
			doc.insertLayer(layer, Math.min(index, doc.layers.length));
			doc.setActiveLayer(layer.id);
			renderer.rebuildActiveLayers();
			documentRegistry.notifyChange(doc);
		},
		dispose: () => {
			if (!doc.layers.includes(layer)) renderer.surfaces.dispose(surfaceId);
		}
	});
}

/**
 * Full pipeline: read source layer → model bytes (cache/download) → session
 * → matte → new cutout layer. Progress covers download / cached-load /
 * inference distinctly. Never touches the source layer.
 */
export async function removeBackgroundFromLayer(
	layerId: string,
	opts: RemoveBackgroundOptions
): Promise<MatteResult | null> {
	const { quality, onProgress, signal, isStale } = opts;
	const model = MODELS[quality];
	// Forced backend (CPU retry) skips auto-detection; otherwise detect.
	const backend: InferenceBackend =
		opts.backendOverride ?? (await detectBackend()).backend;
	if (quality === 'high' && backend !== 'webgpu') {
		throw new BackgroundRemovalError(
			'no-webgpu',
			'High quality needs WebGPU, which this browser does not provide. Use Balanced instead.'
		);
	}
	throwIfStale(isStale);

	const src = await readSourceCanvas(layerId);
	throwIfStale(isStale);

	// Sparse visible-pixel check before paying for a model run.
	const probe = src.canvas.getContext('2d', { willReadFrequently: true })!.getImageData(
		0,
		0,
		src.width,
		src.height
	).data;
	let visible = false;
	for (let i = 3; i < probe.length; i += 256) {
		if (probe[i] > 0) {
			visible = true;
			break;
		}
	}
	if (!visible) {
		throw new BackgroundRemovalError('empty-source', `"${src.layerName}" is fully transparent — nothing to cut out.`);
	}
	throwIfStale(isStale);

	const totalBytes = model.byteSize;
	const { bytes, fromCache } = await ensureModelBytes(
		quality,
		(p) => {
			onProgress({
				phase: 'downloading',
				ratio: p.totalBytes ? Math.min(1, p.loadedBytes / p.totalBytes) : null,
				loadedBytes: p.loadedBytes,
				totalBytes: p.totalBytes,
				backend: null,
				quality,
				fromCache: false
			});
		},
		signal ?? new AbortController().signal,
		() =>
			onProgress({
				phase: 'loading',
				ratio: null,
				loadedBytes: totalBytes,
				totalBytes,
				backend,
				quality,
				fromCache: true
			})
	);
	throwIfStale(isStale);

	if (!fromCache) {
		onProgress({
			phase: 'loading',
			ratio: null,
			loadedBytes: totalBytes,
			totalBytes,
			backend,
			quality,
			fromCache: false
		});
	}

	const runOnce = async (be: InferenceBackend): Promise<MatteResult> => {
		const loaded = await ensureSession(quality, bytes, be);
		throwIfStale(isStale);
		return runMatting(
			loaded,
			src.canvas,
			(phase) => {
				onProgress({
					phase: phase === 'inferring' ? 'inferring' : 'compositing',
					ratio: null,
					loadedBytes: totalBytes,
					totalBytes,
					backend: loaded.backend,
					quality,
					fromCache
				});
			},
			opts.onDebug
		);
	};

	// Upstream reality (onnxruntime-web 1.30 + current Chrome): WITHOUT the
	// load-time graph rewrite (see graph-rewrite.ts), the WebGPU backend
	// emits a `computeSliceOffsets` WGSL shader using the removed
	// `i32(vec4)` conversion, which Tint rejects. The run then "succeeds"
	// with a degenerate all-background matte. When a WebGPU run yields no
	// subject (or fails to start), transparently retry once on the CPU
	// backend, which is proven correct for this graph. Genuinely empty
	// images pay one extra CPU pass; broken-GPU users get a working result
	// with no extra click. Never auto-fallback an explicitly forced backend.
	let result: MatteResult;
	try {
		result = await runOnce(backend);
	} catch (err) {
		const fallbackable =
			!opts.backendOverride &&
			backend === 'webgpu' &&
			quality === 'balanced' &&
			err instanceof BackgroundRemovalError &&
			(err.code === 'empty-source' || err.code === 'session-failed');
		if (!fallbackable) {
			if (
				err instanceof BackgroundRemovalError &&
				err.code === 'empty-source' &&
				quality === 'high'
			) {
				// The 1024 graph carries its own WebGPU-hostile shaders (its
				// Split rewrite emits if-chains past Tint's 127 limit), so an
				// empty matte here often means rejected shaders, not an empty
				// image — and unlike Balanced it cannot fall back to CPU.
				throw new BackgroundRemovalError(
					'empty-source',
					`${err.message} If the subject is clearly visible, this browser is rejecting the high-quality model\u2019s GPU shaders — try Balanced, which can fall back to CPU.`
				);
			}
			throw err;
		}
		throwIfStale(isStale);
		result = await runOnce('wasm');
	}
	throwIfStale(isStale);

	const bitmap = await createImageBitmap(result.canvas);
	commitCutoutLayer(bitmap, layerId, result.backend);
	onProgress({
		phase: 'done',
		ratio: 1,
		loadedBytes: totalBytes,
		totalBytes,
		backend: result.backend,
		quality,
		fromCache
	});
	showNotice(
		`Background removed (${result.backend === 'webgpu' ? 'WebGPU' : 'CPU'}) — original layer kept.`,
		'info'
	);
	return result;
}
