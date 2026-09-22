// Layer: ai. Public types for client-side AI background removal.
// This module never touches the DOM document, the renderer, or Svelte stores
// — the service layer (`service.ts`) bridges into the application.

/** Which model variant to run. `balanced` is the default. */
export type BackgroundRemovalQuality = 'balanced' | 'high';

/** Execution backend actually used for a session. */
export type InferenceBackend = 'webgpu' | 'wasm';

/** Observable phases of a background-removal run. The UI distinguishes
 * first-time download from cached load from inference. */
export type BackgroundRemovalPhase =
	| 'downloading'
	| 'loading'
	| 'inferring'
	| 'compositing'
	| 'done';

/** Progress snapshot pushed to the UI. `totalBytes` is null when the server
 * omits `Content-Length` (the pinned registry sizes are used as fallback). */
export interface BackgroundRemovalProgress {
	phase: BackgroundRemovalPhase;
	/** 0..1 when known, otherwise null (indeterminate). */
	ratio: number | null;
	loadedBytes: number;
	totalBytes: number | null;
	backend: InferenceBackend | null;
	quality: BackgroundRemovalQuality;
	/** True when the model came from the local cache (no download). */
	fromCache: boolean;
}

export type ProgressCallback = (p: BackgroundRemovalProgress) => void;

/** Diagnostic snapshot of one inference pass. Reported through the optional
 * `onDebug` hook (and `console.debug` from the dialog) — the fastest way to
 * tell "empty input" apart from "model sees no subject" apart from
 * "compositing bug" when a cutout comes out wrong. */
export interface InferenceDebug {
	/** Graph I/O as seen by the session (catches input-name mismatches). */
	inputNames: string[];
	outputNames: string[];
	outputType: string;
	/** Mean/std/min/max of the normalized NCHW model input. */
	inputMean: number;
	inputStd: number;
	inputMin: number;
	inputMax: number;
	/** Raw logits stats before sigmoid. */
	logitMean: number;
	logitMax: number;
	logitMin: number;
	/** Matte (post-sigmoid) stats + share of pixels above 0.5. */
	matteMean: number;
	matteMax: number;
	foregroundRatio: number;
	backend: InferenceBackend;
	quality: BackgroundRemovalQuality;
}

export type DebugCallback = (d: InferenceDebug) => void;

/** Result of running the model: a same-size canvas with the foreground on
 * straight alpha (transparent background), ready to upload as a layer. */
export interface MatteResult {
	canvas: HTMLCanvasElement;
	width: number;
	height: number;
	backend: InferenceBackend;
	quality: BackgroundRemovalQuality;
}

export class BackgroundRemovalError extends Error {
	/** Machine-readable reason for UI messaging. */
	readonly code:
		| 'no-webgpu'
		| 'download-failed'
		| 'integrity-mismatch'
		| 'session-failed'
		| 'inference-failed'
		| 'empty-source'
		| 'aborted';
	constructor(code: BackgroundRemovalError['code'], message: string) {
		super(message);
		this.name = 'BackgroundRemovalError';
		this.code = code;
	}
}
