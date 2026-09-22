// Layer: ai. Public surface of the background-removal feature.
// UI code imports from here — never from the inner modules directly.

export type {
	BackgroundRemovalQuality,
	InferenceBackend,
	BackgroundRemovalPhase,
	BackgroundRemovalProgress,
	ProgressCallback,
	InferenceDebug,
	DebugCallback,
	MatteResult
} from './types';
export { BackgroundRemovalError } from './types';
export { MODELS, DEFAULT_QUALITY, modelUrl } from './models';
export type { PinnedModel } from './models';
export { hasCachedModel } from './cache';
export { detectBackend } from './model-loader';
export { releaseSession } from './model-loader';
export { removeBackgroundFromLayer } from './service';
export type { RemoveBackgroundOptions } from './service';
