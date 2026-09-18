<script lang="ts">
	// Layer: components. New Image dialog (File > New… / Ctrl+Alt+N).
	// Uses the shared MovableDialog so it inherits the same Claude-style
	// chrome panel as every other popup (filter popups, image size, curves,
	// levels, …). Non-modal — the canvas stays interactive while the
	// dialog is open, just like Paint.NET.
	import { onMount } from 'svelte';
	import MovableDialog from '../common/MovableDialog.svelte';
	import { MAX_DIMENSION, MAX_PIXELS, formatBytes, surfaceBytes, validateSize } from '../../core/limits';
	import { deviceMaxTextureSize } from '../../services/device';
	import { createNewDocument, openFromClipboard } from '../../services/fileService';
	import { closeDialog } from '../../services/dialogService';

	const device = typeof window !== 'undefined' ? deviceMaxTextureSize() : null;

	const presets = [
		{ label: 'HD (1920×1080)', w: 1920, h: 1080 },
		{ label: 'WXGA (1280×800)', w: 1280, h: 800 },
		{ label: 'Square (1080×1080)', w: 1080, h: 1080 },
		{ label: 'Square (1024×1024)', w: 1024, h: 1024 },
		{ label: 'SVGA (800×600)', w: 800, h: 600 }
	];

	let width = $state(1920);
	let height = $state(1080);
	let background = $state<'transparent' | 'white' | 'custom'>('transparent');
	let customColor = $state('#c0392b');

	const validation = $derived(validateSize(width, height, device ?? undefined));
	const bytes = $derived(surfaceBytes(width || 0, height || 0));
	const selectedBg = $derived(
		background === 'transparent' ? 'Transparent' : background === 'white' ? 'White' : customColor
	);

	let widthInput: HTMLInputElement | undefined = $state();

	function applyPreset(w: number, h: number) {
		width = w;
		height = h;
	}

	function swapDims() {
		const w = width;
		width = height;
		height = w;
	}

	async function create() {
		if (!validation.ok) return;
		const bg: 'transparent' | string =
			background === 'transparent' ? 'transparent' : background === 'white' ? '#ffffff' : customColor;
		const ok = await createNewDocument({ width, height, background: bg });
		if (ok) closeDialog();
	}

	/** Creates a new document from an image currently on the OS clipboard. */
	async function fromClipboard() {
		await openFromClipboard();
		closeDialog();
	}

	function onGlobalKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			// Buttons fire their own click on Enter — don't double-create.
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag !== 'BUTTON' && validation.ok) {
				e.preventDefault();
				void create();
			}
		}
	}

	onMount(() => {
		widthInput?.focus();
		window.addEventListener('keydown', onGlobalKey, true);
		return () => window.removeEventListener('keydown', onGlobalKey, true);
	});
</script>

<MovableDialog title="New Image" onClose={closeDialog} width={460}>
	<div class="field-row">
		<label class="field">
			<span class="field-label">Width (px)</span>
			<input bind:this={widthInput} type="number" min="1" max={MAX_DIMENSION} bind:value={width} />
		</label>
		<button
			type="button"
			class="swap-dims"
			title="Swap width and height"
			aria-label="Swap width and height"
			onclick={swapDims}
		>⇄</button>
		<label class="field">
			<span class="field-label">Height (px)</span>
			<input type="number" min="1" max={MAX_DIMENSION} bind:value={height} />
		</label>
	</div>

	<div>
		<span class="field-label">Presets</span>
		<div class="presets">
			{#each presets as p (p.label)}
				<button type="button" class="preset-chip" onclick={() => applyPreset(p.w, p.h)}>
					{p.label}
				</button>
			{/each}
		</div>
	</div>

	<div>
		<span class="field-label">Background</span>
		<div class="bg-row">
			<label class="radio"><input type="radio" bind:group={background} value="transparent" /> Transparent</label>
			<label class="radio"><input type="radio" bind:group={background} value="white" /> White</label>
			<label class="radio">
				<input type="radio" bind:group={background} value="custom" /> Custom
				{#if background === 'custom'}
					<input type="color" bind:value={customColor} class="color-swatch" />
				{/if}
			</label>
		</div>
	</div>

	<p class="footnote">
		~{formatBytes(bytes)} per layer &middot; background: <strong>{selectedBg}</strong>
		&middot; limit: {MAX_PIXELS.toLocaleString()} px
	</p>

	{#if !validation.ok}
		<div class="error-box">{validation.error}</div>
	{/if}

	{#snippet footerLeft()}
		<button
			type="button"
			class="btn-secondary"
			onclick={() => void fromClipboard()}
			title="Create a document from an image on the clipboard"
		>
			📋 From Clipboard…
		</button>
	{/snippet}

	{#snippet actions()}
		<button type="button" class="btn-secondary" onclick={closeDialog}>Cancel</button>
		<button type="button" class="btn-primary" disabled={!validation.ok} onclick={create}>
			Create
		</button>
	{/snippet}
</MovableDialog>

<style>
	/* Width | ⇄ | Height (swap sits flush between the two fields, same
	   height as the number inputs so the row stays perfectly aligned). */
	.field-row {
		display: grid;
		grid-template-columns: 1fr 32px 1fr;
		gap: 10px;
		align-items: end;
	}
	.swap-dims {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 30px;
		padding: 0;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 5px;
		color: var(--text-dim);
		cursor: pointer;
		font-size: 14px;
		line-height: 1;
	}
	.swap-dims:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 4px;
	}

	.bg-row {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-top: 4px;
	}
	.color-swatch {
		display: inline-block;
		margin-left: 8px;
		height: 24px;
		width: 32px;
		vertical-align: middle;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
	}

	.footnote {
		margin: 0;
		font-size: 11.5px;
		color: var(--text-dim);
	}
	.footnote strong {
		color: var(--text);
		font-weight: 500;
	}
</style>
