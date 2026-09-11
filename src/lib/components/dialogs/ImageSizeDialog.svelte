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
	import MovableDialog from '../common/MovableDialog.svelte';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { resizeCanvas, resizeImage, type ResizeAnchor } from '../../render/resize';
	// The width/height lock. Imported `?raw` and inlined with {@html} so the
	// shipped black SVGs can be tinted (same convention as MenuBar's .menu-svg).
	import LockIcon from '@material-symbols/svg-400/rounded/lock.svg?raw';
	import LockOpenIcon from '@material-symbols/svg-400/rounded/lock_open.svg?raw';

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

	let widthEl = $state<HTMLInputElement | null>(null);

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

	/** Toggle the width/height lock. Switching it ON re-syncs the two values
	 * straight away — otherwise you could lock the ratio, hit OK and still get a
	 * distorted image, which is the one thing the lock promises not to do. The
	 * field edited last wins, exactly as if you had just typed in it. */
	function toggleConstrain() {
		constrain = !constrain;
		if (!constrain) return;
		if (lastEdit === 'h') updateFromHeight();
		else updateFromWidth();
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
		// Opened to type numbers — put the caret there straight away.
		queueMicrotask(() => {
			widthEl?.focus();
			widthEl?.select();
		});
		return () => window.removeEventListener('keydown', onGlobalKey, true);
	});
</script>

<!-- Non-modal on purpose (MovableDialog, like the Selection Size dialog): no
     dimming backdrop, so the canvas stays visible and interactive, with an X
     button and drag-by-title. -->
<MovableDialog title={mode === 'resize' ? 'Resize Image' : 'Canvas Size'} onClose={closeDialog}>
	<div class="space-y-3">
			<div class="seg" role="group" aria-label="Resize mode">
				<button class="seg-btn" class:on={mode === 'resize'} onclick={() => (mode = 'resize')} type="button">
					Resize image
				</button>
				<button class="seg-btn" class:on={mode === 'canvas'} onclick={() => (mode = 'canvas')} type="button">
					Canvas size
				</button>
			</div>

			<div class="dims">
				<label class="field">
					<span class="field-label">Width (px)</span>
					<input
						type="number"
						min="1"
						max={MAX_DIMENSION}
						bind:this={widthEl}
						bind:value={width}
						onchange={updateFromWidth}
					/>
				</label>
				<!-- The width/height ratio lock. Sits between the two fields it
				     relates, rather than beside the dialog as a labelled
				     checkbox; the words survive as the tooltip / accessible
				     name. -->
				<button
					type="button"
					class="lock-btn"
					class:on={constrain}
					aria-pressed={constrain}
					aria-label="Constrain proportions"
					title="Constrain proportions: {constrain ? 'on' : 'off'}"
					onclick={toggleConstrain}
				>
					<span class="lock-ic" aria-hidden="true">{@html constrain ? LockIcon : LockOpenIcon}</span>
				</button>
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

			<!-- Same template as the Width/Height row, so the Scale field lines up
			     with the Width field instead of drifting wider. -->
			<div class="dims">
				<label class="field">
					<span class="field-label">Scale (%)</span>
					<input type="number" min="1" max="1000" bind:value={scalePct} onchange={updateFromPercent} />
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

	{#snippet actions()}
		<button class="btn-secondary" onclick={() => closeDialog()}>Cancel</button>
		<button class="btn-primary" disabled={!validation.ok} onclick={apply}>OK</button>
	{/snippet}
</MovableDialog>

<style>
	/* Width | lock | Height. The middle column is a fixed 32px — the lock's own
	   width — rather than `auto`, so the Scale row can reuse the same template
	   and still line its single field up with the Width field exactly. */
	.dims {
		display: grid;
		grid-template-columns: 1fr 32px 1fr;
		gap: 12px;
		align-items: end;
	}
	.lock-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		/* Matches `.field input[type='number']` (6px padding + 13px text + border)
		   so the toggle sits flush with the two inputs it joins. */
		height: 30px;
		padding: 0;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 5px;
		color: var(--text-dim);
		cursor: pointer;
	}
	.lock-btn:hover {
		border-color: var(--accent);
		color: var(--text);
	}
	.lock-btn.on {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--accent);
	}
	.lock-ic {
		display: inline-flex;
		width: 16px;
		height: 16px;
	}
	/* `:global` because the <svg> comes from {@html} — Svelte's scoping class is
	   never added to raw-injected markup, so a plain descendant selector would
	   be reported as unused and silently never match. */
	.lock-ic :global(svg) {
		width: 16px;
		height: 16px;
		fill: currentColor;
	}

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