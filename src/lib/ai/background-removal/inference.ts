// Layer: ai. Pure model math: canvas in → cutout canvas out.
// No renderer, no stores, no DOM document access beyond canvas 2D (which the
// caller provides). Original resolution is preserved throughout: only the
// MODEL input is resized; the mask is upscaled back and applied to the
// full-resolution source pixels.
//
// EXIF note: this pipeline never decodes files itself — it operates in
// layer-pixel space on pixels the app already imported. Source and mask share
// the identical pixel grid, so orientation is preserved 1:1 by construction.

import * as ort from 'onnxruntime-web';
import { IMAGENET_MEAN, IMAGENET_STD } from './models';
import type { LoadedSession } from './model-loader';
import { BackgroundRemovalError, type DebugCallback, type MatteResult } from './types';

/** Lets the UI paint between heavy synchronous phases. */
function yieldToUi(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function statsOf(a: Float32Array, stride = 1): { mean: number; min: number; max: number; std: number } {
	let min = Infinity;
	let max = -Infinity;
	let sum = 0;
	let count = 0;
	for (let i = 0; i < a.length; i += stride) {
		const v = a[i];
		if (v < min) min = v;
		if (v > max) max = v;
		sum += v;
		count++;
	}
	const mean = count ? sum / count : 0;
	let sq = 0;
	for (let i = 0; i < a.length; i += stride) {
		const d = a[i] - mean;
		sq += d * d;
	}
	return { mean, min, max, std: count ? Math.sqrt(sq / count) : 0 };
}

/** IEEE-754 binary16 → float32. The fp16 graphs may emit float16 tensors;
 * reading the raw bits as integers would produce garbage mattes. */
function halfBitsToFloat(h: number): number {
	const s = (h & 0x8000) >> 15;
	const e = (h & 0x7c00) >> 10;
	const f = h & 0x03ff;
	if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
	if (e === 31) return f ? NaN : (s ? -1 : 1) * Infinity;
	return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

/** Copies an ORT output tensor to float32, converting float16 if needed. */
function tensorToFloat32(t: ort.Tensor): Float32Array {
	const data = t.data;
	if (typeof t.type === 'string' && t.type.toLowerCase().includes('16')) {
		const u16 = data as unknown as Uint16Array;
		const out = new Float32Array(u16.length);
		for (let i = 0; i < u16.length; i++) out[i] = halfBitsToFloat(u16[i]);
		return out;
	}
	return Float32Array.from(data as Float32Array | number[]);
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.round(w));
	c.height = Math.max(1, Math.round(h));
	return c;
}

/** Source → model-size RGB canvas (browser high-quality downscale). */
function resizeForModel(source: HTMLCanvasElement, size: number): HTMLCanvasElement {
	const c = makeCanvas(size, size);
	const ctx = c.getContext('2d', { willReadFrequently: true })!;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(source, 0, 0, size, size);
	return c;
}

/** RGBA pixels → NCHW float32 tensor, rescale 1/255 + ImageNet normalize. */
function toNchwTensor(sized: HTMLCanvasElement, size: number): ort.Tensor {
	const ctx = sized.getContext('2d', { willReadFrequently: true })!;
	const data = ctx.getImageData(0, 0, size, size).data;
	const n = size * size;
	const chw = new Float32Array(3 * n);
	const inv255 = 1 / 255;
	for (let i = 0; i < n; i++) {
		const r = data[i * 4] * inv255;
		const g = data[i * 4 + 1] * inv255;
		const b = data[i * 4 + 2] * inv255;
		chw[i] = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
		chw[n + i] = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
		chw[2 * n + i] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
	}
	return new ort.Tensor('float32', chw, [1, 3, size, size]);
}

function sigmoidInPlace(logits: Float32Array): void {
	for (let i = 0; i < logits.length; i++) {
		const x = logits[i];
		// Stable sigmoid; logits outside ±30 saturate exactly.
		logits[i] = x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
	}
}

/** Model-res matte (0..1) → full-resolution alpha canvas via GPU-cheap
 * 2D upscale (bilinear), avoiding a manual interpolation pass. */
function upscaleMask(matte: Float32Array, modelSize: number, width: number, height: number): ImageData {
	const small = makeCanvas(modelSize, modelSize);
	const sctx = small.getContext('2d', { willReadFrequently: true })!;
	const img = sctx.createImageData(modelSize, modelSize);
	const px = img.data;
	for (let i = 0; i < matte.length; i++) {
		const a = Math.max(0, Math.min(1, matte[i]));
		px[i * 4] = 255;
		px[i * 4 + 1] = 255;
		px[i * 4 + 2] = 255;
		px[i * 4 + 3] = Math.round(a * 255);
	}
	sctx.putImageData(img, 0, 0);

	const full = makeCanvas(width, height);
	const fctx = full.getContext('2d', { willReadFrequently: true })!;
	fctx.imageSmoothingEnabled = true;
	fctx.imageSmoothingQuality = 'high';
	fctx.drawImage(small, 0, 0, width, height);
	return fctx.getImageData(0, 0, width, height);
}

/**
 * Runs the loaded session on `source` (any size) and returns a same-size
 * canvas: original RGB, alpha = source alpha × matte. The source canvas is
 * never mutated. Throws BackgroundRemovalError on empty sources or ORT
 * failures. Yields between phases so progress UI can paint.
 */
export async function runMatting(
	loaded: LoadedSession,
	source: HTMLCanvasElement,
	onPhase?: (phase: 'inferring' | 'compositing') => void,
	onDebug?: DebugCallback
): Promise<MatteResult> {
	const width = source.width;
	const height = source.height;
	if (width < 1 || height < 1) {
		throw new BackgroundRemovalError('empty-source', 'The source layer has no pixels to process.');
	}
	const size = loaded.inputSize;

	// 1 — downscale a COPY for the model; the source stays full-resolution.
	const sized = resizeForModel(source, size);
	const tensor = toNchwTensor(sized, size);
	const inputStats = statsOf(tensor.data as Float32Array, 997);
	await yieldToUi();

	// 2 — inference (async; WebGPU compute leaves the main thread responsive).
	onPhase?.('inferring');
	let logits: Float32Array;
	let outputType = 'unknown';
	try {
		const feeds: Record<string, ort.Tensor> = { [loaded.inputName]: tensor };
		const out = await loaded.session.run(feeds);
		const firstKey = loaded.session.outputNames[0] ?? Object.keys(out)[0];
		const t = out[firstKey];
		outputType = t ? String(t.type) : 'missing';
		const floats = t ? tensorToFloat32(t) : null;
		if (!floats || floats.length !== size * size) {
			throw new Error(`unexpected output shape (${String(t?.data.length)})`);
		}
		logits = floats;
	} catch (err) {
		if (err instanceof BackgroundRemovalError) throw err;
		throw new BackgroundRemovalError(
			'inference-failed',
			`Inference failed on ${loaded.backend === 'webgpu' ? 'WebGPU' : 'CPU'} (${err instanceof Error ? err.message : 'unknown error'}).`
		);
	}
	const logitStats = statsOf(logits, 997);
	sigmoidInPlace(logits);
	const matteStats = statsOf(logits, 997);
	let foreground = 0;
	for (let i = 0; i < logits.length; i += 7) if (logits[i] > 0.5) foreground++;
	const foregroundRatio = foreground / Math.ceil(logits.length / 7);
	onDebug?.({
		inputNames: [...loaded.session.inputNames],
		outputNames: [...loaded.session.outputNames],
		outputType,
		inputMean: inputStats.mean,
		inputStd: inputStats.std,
		inputMin: inputStats.min,
		inputMax: inputStats.max,
		logitMean: logitStats.mean,
		logitMax: logitStats.max,
		logitMin: logitStats.min,
		matteMean: matteStats.mean,
		matteMax: matteStats.max,
		foregroundRatio,
		backend: loaded.backend,
		quality: loaded.quality
	});
	if (matteStats.max < 0.5) {
		throw new BackgroundRemovalError(
			'empty-source',
			'No foreground subject detected — the model found nothing to keep in this layer.'
		);
	}
	await yieldToUi();

	// 3 — upscale the matte and composite onto the ORIGINAL pixels.
	onPhase?.('compositing');
	const maskFull = upscaleMask(logits, size, width, height);
	const sctx = source.getContext('2d', { willReadFrequently: true })!;
	const src = sctx.getImageData(0, 0, width, height);
	const out = makeCanvas(width, height);
	const octx = out.getContext('2d')!;
	const dst = octx.createImageData(width, height);
	const sp = src.data;
	const mp = maskFull.data;
	const dp = dst.data;
	for (let i = 0; i < width * height; i++) {
		const m = mp[i * 4 + 3] / 255;
		dp[i * 4] = sp[i * 4];
		dp[i * 4 + 1] = sp[i * 4 + 1];
		dp[i * 4 + 2] = sp[i * 4 + 2];
		// Matte multiplies existing alpha: existing transparency survives.
		dp[i * 4 + 3] = Math.round(sp[i * 4 + 3] * m);
	}
	octx.putImageData(dst, 0, 0);
	await yieldToUi();

	return { canvas: out, width, height, backend: loaded.backend, quality: loaded.quality };
}
