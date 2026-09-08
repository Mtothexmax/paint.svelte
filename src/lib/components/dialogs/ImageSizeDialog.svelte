<script lang="ts">
	// Layer: components. Image > Resize / Canvas Size dialog (Paint.NET style):
	// switch between resizing the whole image (all layers scaled) and resizing
	// just the canvas (content placed with a 9-position anchor, transparent
	// beyond). Opened from the document dimensions in the status bar or the
	// Image menu.
	import { onMount } from 'svelte';
	import { documentRegistry } from '../../core/document/registry';
	import { MAX_DIMENSION, MAX_PIXELS, formatBytes, surfaceBytes, validateSize } from '../../core/limits';
	import { deviceMaxTextureSize } from '../../services/device';
	import { dialog, closeDialog, type ImageSizeDialogPayload } from '../../services/dialogService';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { resizeCanvas, resizeImage, type ResizeAnchor } from '../../render/resize';

	const payload = $dialog.payload as ImageSizeDialogPayload | undefined;

	const doc = documentRegistry.active;
	const device = typeof window !== 'undefined' ? deviceMaxTextureSize() : null;
	const origW = doc?.width ?? 0;
	const origH = doc?.height ?? 0;

	let mode = $state<'resize' | 'canvas'>(payload?.mode ?? 'resize');
	let width = $state(origW);
	let height = $state(origH);
	let scalePct = $state(100);
	let constrain = $state(true);
	let lastEdit = $state<'w' | 'h' | 'pct'>('w');
	let ax = $state<ResizeAnchor>(0);
	let ay = $state<ResizeAnchor>(0);
	const anchors: ResizeAnchor[] = [-1, 0, 1];

	const validation = $derived(
		validateSize(Math.round(width || 0), Math.round(height || 0), device ?? undefined)
	);

	function clampInt(v: number): number {
		const n = Math.round(Number(v));
		return Number.isFinite(n) ? Math.max(1, n) : 1;
	}

	function updateFromWidth() {
		lastEdit = 'w';
		width = clampInt(width);
		if (constrain && origW > 0) height = Math.max(1, Math.round((width * origH) / origW));
		updatePercent();
	}

	function updateFromHeight() {
		lastEdit = 'h';
		height = clampInt(height);
		if (constrain && origH > 0) width = Math.max(1, Math.round((height * origW) / origH));
		updatePercent();
	}

	function updateFromPercent() {
		lastEdit = 'pct';
		const p = Math.max(1, Math.min(1000, Number(scalePct) || 1));
		scalePct = p;
		width = Math.max(1, Math.round((origW * p) / 100));
		height = Math.max(1, Math.round((origH * p) / 100));
	}

	function updatePercent() {
		if (origW > 0 && origH > 0) {
			const byW = origW !== 0 ? (width / origW) * 100 : 100;
			const byH = origH !== 0 ? (height / origH) * 100 : 100;
			const p = constrain ? byW : Math.min(byW, byH);
			scalePct = Math.round(p);
		}
	}

	function apply() {
		if (!validation.ok || !doc) return;
		const renderer = getEditorRenderer();
		const w = Math.round(width);
		const h = Math.round(height);
		if (mode === 'resize') {
			if (resizeImage(renderer, w, h)) closeDialog();
		} else {
			if (resizeCanvas(renderer, w, h, ax, ay)) closeDialog();
		}
	}

	function onGlobalKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			closeDialog();
			return;
		}
		if (e.key === 'Enter') {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag !== 'BUTTON' && validation.ok) {
				e.preventDefault();
				apply();
			}
		}
	}

	onMount(() => {
		window.addEventListener('keydown', onGlobalKey, true);
		return () => window.removeEventListener('keydown', onGlobalKey, true);
	});
</script>

<div class="dialog-backdrop" onclick={() => closeDialog()}>
	<div
		class="dialog"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-label={mode === 'resize' ? 'Resize Image' : 'Canvas Size'}
	>
		<h2 class="dialog-title">{mode === 'resize' ? 'Resize Image' : 'Canvas Size'}</h2>

		<div class="space-y-3 p-4">
			<div class="seg" role="group" aria-label="Resize mode">
				<button class="seg-btn" class:on={mode === 'resize'} onclick={() => (mode = 'resize')} type="button">
					Resize image
				</button>
				<button class="seg-btn" class:on={mode === 'canvas'} onclick={() => (mode = 'canvas')} type="button">
					Canvas size
				</button>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<label class="field">
					<span class="field-label">Width (px)</span>
					<input
						type="number"
						min="1"
						max={MAX_DIMENSION}
						bind:value={width}
						onchange={updateFromWidth}
					/>
				</label>
				<label class="field">
					<span class="field-label">Height (px)</span>
					<input
						type="number"
						min="1"
						max={MAX_DIMENSION}
						bind:value={height}
						onchange={updateFromHeight}
					/>
				</label>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<label class="field">
					<span class="field-label">Scale (%)</span>
					<input type="number" min="1" max="1000" bind:value={scalePct} onchange={updateFromPercent} />
				</label>
				<label class="radio mt-2 items-start" style="align-items:center;">
					<input type="checkbox" bind:checked={constrain} /> Constrain proportions
				</label>
			</div>

			{#if mode === 'canvas'}
				<div>
					<span class="field-label">Anchor</span>
					<div class="anchor-grid" role="group" aria-label="Content anchor">
						{#each anchors as row}
							{#each anchors as col}
								<button
									type="button"
									class="anchor-cell"
									class:active={ax === col && ay === row}
									onclick={() => {
										ax = col;
										ay = row;
									}}
									aria-pressed={ax === col && ay === row}
									aria-label={`Anchor ${row + 1} ${col + 1}`}
								>
									<span class="anchor-dot" class:center={col === 0 && row === 0}></span>
								</button>
							{/each}
						{/each}
					</div>
					<div class="text-xs" style="color:#9a9a9a;">
						The area beyond the current image becomes transparent.
					</div>
				</div>
			{/if}

			<div class="text-xs" style="color:#9a9a9a;">
				Current: {origW} × {origH} px &middot; New: {Math.round(width || 0)} × {Math.round(height || 0)} px
				&middot; ~{formatBytes(surfaceBytes(Math.round(width || 0), Math.round(height || 0)))} per layer
				&middot; limit: {MAX_PIXELS.toLocaleString()} px
			</div>

			{#if !validation.ok}
				<div class="error-box">{validation.error}</div>
			{/if}
		</div>

		<div class="dialog-footer">
			<button class="btn-secondary" onclick={() => closeDialog()}>Cancel</button>
			<button class="btn-primary" disabled={!validation.ok} onclick={apply}>OK</button>
		</div>
	</div>
</div>

<style>
	.anchor-grid {
		display: grid;
		grid-template-columns: repeat(3, 34px);
		gap: 4px;
		margin-top: 6px;
		margin-bottom: 6px;
	}
	.anchor-cell {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 5px;
		cursor: pointer;
	}
	.anchor-cell:hover {
		border-color: var(--accent);
	}
	.anchor-cell.active {
		background: var(--accent-soft);
		border-color: var(--accent);
	}
	.anchor-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: var(--text-dim);
	}
	.anchor-dot.center {
		background: var(--accent);
	}
	.anchor-cell.active .anchor-dot {
		background: var(--accent);
	}
</style>