// Layer: ai. Pinned model registry — the SINGLE place that knows model URLs,
// revisions, sizes, and preprocessing. Nothing else in the app may hardcode a
// model URL or filename.
//
// Verified 2026-09-22 against the Hugging Face Hub API (repo metadata,
// file listing, license) and HTTP HEAD on the pinned `resolve/` URLs
// (exact byte sizes, `accept-ranges: bytes`, `access-control-allow-origin: *`).
// Weights are MIT-licensed including the model weights themselves (see each
// repo's model card). Caveat, quoted honestly from the 1024 card: upstream
// BiRefNet lists DIS5K among its training sets and DIS5K's own terms restrict
// commercial use of the dataset — an open question for every model trained on
// it, not something the downstream MIT grant resolves.
//
// NOTHING here is committed to git — these descriptors only point at Hugging
// Face, which serves as the model CDN at runtime.

import type { BackgroundRemovalQuality } from './types';

export interface PinnedModel {
	/** Stable id used for cache keys and settings. */
	id: 'birefnet-lite-512-fp16' | 'birefnet-lite-1024-fp16';
	quality: BackgroundRemovalQuality;
	label: string;
	detail: string;
	repo: string;
	revision: string;
	file: string;
	/** Exact byte size from HTTP HEAD on the pinned resolve URL. */
	byteSize: number;
	/** Published checksum when the model card provides one (hex). */
	sha256: string | null;
	/** Model input resolution (square). */
	inputSize: number;
	license: string;
	/** True when this variant is only viable on WebGPU (memory). */
	requiresWebGpu: boolean;
}

function urlOf(m: Pick<PinnedModel, 'repo' | 'revision' | 'file'>): string {
	return `https://huggingface.co/${m.repo}/resolve/${m.revision}/${m.file}`;
}

const BALANCED: PinnedModel = {
	id: 'birefnet-lite-512-fp16',
	quality: 'balanced',
	label: 'Balanced',
	detail: '512 × 512 · ~94 MB download · fast, runs on WebGPU and CPU',
	repo: 'studioludens/birefnet-lite-512',
	revision: '4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7',
	file: 'onnx/model_fp16.onnx',
	byteSize: 98484532,
	sha256: null,
	inputSize: 512,
	license: 'MIT',
	requiresWebGpu: false
};

const HIGH: PinnedModel = {
	id: 'birefnet-lite-1024-fp16',
	quality: 'high',
	label: 'High quality',
	detail: '1024 × 1024 · ~115 MB download · WebGPU only, slower, finer edges',
	// PARKED (2026-09-22): runes/birefnet-lite-webgpu was trialled here and
	// produces a correct matte in headless SwiftShader, but on real GPUs it
	// yields confident, NON-DETERMINISTIC garbage (unrelated textured output
	// varying run to run) — invalid for evaluation, worse than a clean
	// error. Do not re-point here until 512-on-WebGPU is proven. The jiabins
	// entry below at least fails loudly (Tint 127-chain rejection) instead
	// of committing garbage layers.
	repo: 'jiabins0303/birefnet-lite-1024-webgpu',
	revision: 'dc4edd9f7623961aa5ae2b186c1b428f4ed38d6a',
	file: 'onnx/model_fp16.onnx',
	byteSize: 114834127,
	sha256: '4059896039dfccb0f15b9080ff06d11d90e499449bb045e797055eb8901cf5f4',
	inputSize: 1024,
	license: 'MIT',
	requiresWebGpu: true
};

export const MODELS: Record<BackgroundRemovalQuality, PinnedModel> = {
	balanced: BALANCED,
	high: HIGH
};

/** The default quality. Do NOT change to 'high' — the 1024 model must stay
 * opt-in and must never download without the user selecting it. */
export const DEFAULT_QUALITY: BackgroundRemovalQuality = 'balanced';

/** Stable download URL for a pinned model (follows HF's CDN redirect). */
export function modelUrl(model: PinnedModel): string {
	return urlOf(model);
}

/** ImageNet normalization used by both BiRefNet Lite exports. */
export const IMAGENET_MEAN = [0.485, 0.456, 0.406];
export const IMAGENET_STD = [0.229, 0.224, 0.225];
