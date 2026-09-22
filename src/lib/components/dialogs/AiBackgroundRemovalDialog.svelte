<script lang="ts">
	import './AiBackgroundRemovalDialog.css';
	// Layer: components. Progress dialog for client-side AI background
	// removal (BiRefNet Lite via ONNX Runtime Web). The heavy work lives in
	// lib/ai/background-removal — this component only renders state:
	// idle → downloading (first run) / loading (cached) → inferring →
	// compositing → done, plus backend/quality selection and errors.
	import { onMount } from 'svelte';
	import MovableDialog from '../common/MovableDialog.svelte';
	import { closeDialog, type AiBackgroundRemovalPayload } from '../../services/dialogService';
	import { documentRegistry } from '../../core/document/registry';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import {
		MODELS,
		DEFAULT_QUALITY,
		detectBackend,
		hasCachedModel,
		removeBackgroundFromLayer,
		BackgroundRemovalError,
		type BackgroundRemovalQuality,
		type BackgroundRemovalProgress,
		type InferenceBackend
	} from '../../ai/background-removal';

	interface Props {
		payload: AiBackgroundRemovalPayload;
	}
	let { payload }: Props = $props();

	interface AiSettings {
		quality: BackgroundRemovalQuality;
		/** Qualities the user already agreed to download. First run per
		 * model asks explicitly; the answer persists here. */
		downloadGranted: BackgroundRemovalQuality[];
		/** Backend pin: 'auto' detects WebGPU with CPU fallback; an explicit
		 * choice runs pinned with NO fallback (diagnostics, broken drivers). */
		backend: 'auto' | InferenceBackend;
	}
	const SETTINGS_KEY = 'ai.backgroundRemoval';
	const DEFAULT_SETTINGS: AiSettings = {
		quality: DEFAULT_QUALITY,
		downloadGranted: [],
		backend: 'auto'
	};

	type Status = 'idle' | 'working' | 'error';

	let status = $state<Status>('idle');
	let settings = $state<AiSettings>(getSettings<AiSettings>(SETTINGS_KEY, DEFAULT_SETTINGS));
	let quality = $state<BackgroundRemovalQuality>(settings.quality);
	/** null while the IndexedDB existence check is in flight. */
	let cached = $state<boolean | null>(null);
	/** First-run question: model missing AND no stored consent for it. */
	const needsConsent = $derived(cached === false && !settings.downloadGranted.includes(quality));
	let backend = $state<InferenceBackend | null>(null);
	let backendNote = $state<string | null>(null);
	let backendReady = $state(false);
	let webgpuAvailable = $state(false);
	let adapterHighOk = $state(false);
	let progress = $state<BackgroundRemovalProgress | null>(null);
	let error = $state<string | null>(null);
	let sourceLabel = $state('…');
	let runToken = 0;
	let aborter: AbortController | null = null;
	/** Effective backend: explicit pin wins, otherwise auto-detect. */
	const effectiveBackend = $derived<'auto' | InferenceBackend>(
		settings.backend === 'auto' ? (backend ?? 'auto') : settings.backend
	);
	const highSupported = $derived(
		effectiveBackend === 'webgpu' && webgpuAvailable && adapterHighOk
	);
	const highBlockReason = $derived(
		effectiveBackend === 'wasm'
			? 'High needs WebGPU (CPU pinned)'
			: !webgpuAvailable
				? 'Needs WebGPU (unavailable here)'
				: !adapterHighOk
					? 'Adapter reports too few storage buffers'
					: null
	);

	function fmtMB(bytes: number): string {
		return `${(bytes / 1048576).toFixed(1)} MB`;
	}

	function phaseLabel(p: BackgroundRemovalProgress): string {
		const model = MODELS[p.quality];
		switch (p.phase) {
			case 'downloading':
				return `Downloading model (${model.label} ${fmtMB(model.byteSize)})…`;
			case 'loading':
				return p.fromCache
					? `Loading cached model (${model.label})…`
					: `Loading model (${model.label})…`;
			case 'inferring':
				return `Removing background (${p.backend === 'webgpu' ? 'WebGPU' : 'CPU'})…`;
			case 'compositing':
				return 'Applying mask at full resolution…';
			case 'done':
				return 'Done.';
		}
	}

	function persistSettings(): void {
		saveSettings(SETTINGS_KEY, settings);
	}

	async function refreshCached(): Promise<void> {
		cached = null;
		try {
			cached = await hasCachedModel(MODELS[quality]);
		} catch {
			cached = false;
		}
	}

	onMount(() => {
		const doc = documentRegistry.active;
		const layer =
			doc?.layers.find((l) => l.id === payload.layerId) ?? doc?.activeLayer ?? null;
		sourceLabel = layer ? `"${layer.name}" (${doc!.width} × ${doc!.height})` : 'no layer';
		void refreshCached();
		void detectBackend().then((info) => {
			backend = info.backend;
			backendNote = info.note;
			backendReady = true;
			webgpuAvailable = info.webgpuAvailable;
			adapterHighOk = info.highQualitySupported;
			// Never strand the user on an unusable option.
			if (quality === 'high' && !(backend === 'webgpu' && info.webgpuAvailable && info.highQualitySupported)) {
				quality = 'balanced';
				settings = { ...settings, quality };
				persistSettings();
			}
		});
	});

	function setQuality(q: BackgroundRemovalQuality): void {
		if (status === 'working' || q === quality) return;
		quality = q;
		settings = { ...settings, quality: q };
		persistSettings();
		void refreshCached();
	}

	function setBackend(b: 'auto' | InferenceBackend): void {
		if (status === 'working' || b === settings.backend) return;
		// CPU cannot run the High tier: drop to Balanced with it.
		const q = b === 'wasm' && quality === 'high' ? 'balanced' : quality;
		quality = q;
		settings = { ...settings, backend: b, quality: q };
		persistSettings();
	}

	async function start(): Promise<void> {
		if (status === 'working') return;
		// First run per model: the primary button IS the consent — recording
		// it here means later opens skip the question for this model.
		if (needsConsent && !settings.downloadGranted.includes(quality)) {
			settings = { ...settings, downloadGranted: [...settings.downloadGranted, quality] };
			persistSettings();
		}
		status = 'working';
		error = null;
		progress = null;
		const token = ++runToken;
		aborter = new AbortController();
		const stale = () => token !== runToken;
		try {
			await removeBackgroundFromLayer(payload.layerId, {
				quality,
				signal: aborter.signal,
				isStale: stale,
				onProgress: (p) => {
					if (!stale()) progress = p;
				},
				// One debug-level line per run: input/logit/matte stats make
				// "empty cutout" reports diagnosable from the console.
				onDebug: (d) => console.debug(`[bg-removal] ${JSON.stringify(d)}`),
				// Explicit pin runs isolated with NO fallback — that is the
				// point of pinning (diagnostics, broken drivers).
				backendOverride: settings.backend === 'auto' ? undefined : settings.backend
			});
			if (!stale()) closeDialog();
		} catch (err) {
			if (stale() || (err instanceof BackgroundRemovalError && err.code === 'aborted')) {
				closeDialog();
				return;
			}
			error =
				err instanceof BackgroundRemovalError
					? err.message
					: `Unexpected error (${err instanceof Error ? err.message : 'unknown'}).`;
			status = 'error';
		} finally {
			if (!stale()) aborter = null;
		}
	}

	function cancel(): void {
		runToken++;
		aborter?.abort();
		aborter = null;
		closeDialog();
	}
</script>

<MovableDialog title="Remove Background" onClose={cancel} width={380}>
	<div class="ai-body">
		<p class="ai-source">Source layer: <strong>{sourceLabel}</strong></p>
		<p class="ai-note">Runs entirely in this browser — no upload, no account. The original layer is kept; the cutout lands on a new layer above it.</p>

		<div class="seg ai-quality" role="group" aria-label="Model quality">
			<button
				class="seg-btn"
				class:on={quality === 'balanced'}
				onclick={() => setQuality('balanced')}
				disabled={status === 'working'}
				title={MODELS.balanced.detail}
			>
				Balanced · 512
			</button>
			<button
				class="seg-btn"
				class:on={quality === 'high'}
				onclick={() => setQuality('high')}
				disabled={status === 'working' || !highSupported}
				title={highSupported
					? MODELS.high.detail
					: `High quality unavailable: ${highBlockReason ?? 'unknown reason'}`}
			>
				High · 1024
			</button>
		</div>
		<p class="ai-detail">
			{quality === 'balanced' ? MODELS.balanced.detail : MODELS.high.detail}
			{quality === 'high' ? ' — downloads only when you run it.' : ' — downloads once, then reused offline.'}
		</p>

		<div class="seg ai-quality" role="group" aria-label="Execution backend">
			<button
				class="seg-btn"
				class:on={settings.backend === 'auto'}
				onclick={() => setBackend('auto')}
				disabled={status === 'working'}
				title="Detect WebGPU, fall back to CPU when its result is empty"
			>
				Auto
			</button>
			<button
				class="seg-btn"
				class:on={settings.backend === 'webgpu'}
				onclick={() => setBackend('webgpu')}
				disabled={status === 'working'}
				title="WebGPU only, no fallback — for diagnostics"
			>
				GPU
			</button>
			<button
				class="seg-btn"
				class:on={settings.backend === 'wasm'}
				onclick={() => setBackend('wasm')}
				disabled={status === 'working'}
				title="CPU only, no fallback — slower but deterministic"
			>
				CPU
			</button>
		</div>

		{#if needsConsent}
			<p class="ai-consent" role="group" aria-label="Download consent">
				First run needs a one-time download: the {MODELS[quality].label} model
				({fmtMB(MODELS[quality].byteSize)}) from Hugging Face. It is stored in
				this browser's cache and reused offline — your images never leave this device.
			</p>
		{/if}

		<p class="ai-backend" aria-live="polite">
			{#if settings.backend !== 'auto'}
				Backend pinned: {settings.backend === 'webgpu' ? 'GPU (no fallback)' : 'CPU (no fallback)'}.
			{:else if !backendReady}
				Detecting hardware…
			{:else if backend === 'webgpu'}
				Backend: WebGPU (auto CPU fallback).
			{:else}
				Backend: CPU fallback. {backendNote ?? 'Processing will be slower.'}
			{/if}
		</p>

		{#if progress}
			<div class="ai-progress" role="status" aria-live="polite">
				<div class="ai-progress-label">{phaseLabel(progress)}</div>
				<div class="ai-progress-well">
					{#if progress.ratio !== null}
						<div class="ai-progress-fill" style="width:{Math.round(progress.ratio * 100)}%;"></div>
					{:else}
						<div class="ai-progress-fill indeterminate"></div>
					{/if}
				</div>
				<div class="ai-progress-bytes">
					{#if progress.phase === 'downloading' && progress.totalBytes}
						{fmtMB(progress.loadedBytes)} / {fmtMB(progress.totalBytes)}
					{:else if progress.fromCache && (progress.phase === 'loading' || progress.phase === 'done')}
						from local cache
					{/if}
				</div>
			</div>
		{/if}

		{#if status === 'error' && error}
			<p class="ai-error" role="alert">{error}</p>
		{/if}
	</div>

	{#snippet actions()}
		{#if status === 'working'}
			<button class="btn-secondary" onclick={cancel}>Cancel</button>
			<button class="btn-primary" disabled>Working…</button>
		{:else if needsConsent}
			<button class="btn-secondary" onclick={cancel}>Not now</button>
			<button class="btn-primary" onclick={start}>
				Download ({fmtMB(MODELS[quality].byteSize)})
			</button>
		{:else}
			<button class="btn-secondary" onclick={cancel}>Close</button>
			<button class="btn-primary" onclick={start}>
				{status === 'error' ? 'Retry' : cached === false ? 'Download & Remove Background' : 'Remove Background'}
			</button>
		{/if}
	{/snippet}
</MovableDialog>
