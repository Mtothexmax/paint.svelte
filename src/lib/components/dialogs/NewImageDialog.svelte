<script lang="ts">
	// Layer: components. New Image dialog (Slice 1).
	import { onMount } from 'svelte';
	import { MAX_DIMENSION, MAX_PIXELS, formatBytes, surfaceBytes, validateSize } from '../../core/limits';
	import { deviceMaxTextureSize } from '../../services/device';
	import { createNewDocument } from '../../services/fileService';
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

	function applyPreset(w: number, h: number) {
		width = w;
		height = h;
	}

	async function create() {
		if (!validation.ok) return;
		const bg: 'transparent' | string = background === 'transparent' ? 'transparent' : background === 'white' ? '#ffffff' : customColor;
		const ok = await createNewDocument({ width, height, background: bg });
		if (ok) closeDialog();
	}

	function onGlobalKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			closeDialog();
			return;
		}
		if (e.key === 'Enter') {
			// Buttons fire their own click on Enter — don't double-create.
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag !== 'BUTTON' && validation.ok) {
				e.preventDefault();
				void create();
			}
		}
	}

	let widthInput: HTMLInputElement;
	onMount(() => {
		widthInput?.focus();
		window.addEventListener('keydown', onGlobalKey, true);
		return () => window.removeEventListener('keydown', onGlobalKey, true);
	});
</script>

<div class="dialog-backdrop" onclick={() => closeDialog()}>
	<div class="dialog" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="New image">
		<h2 class="dialog-title">New Image</h2>

		<div class="space-y-3 p-4">
			<div class="grid grid-cols-2 gap-3">
				<label class="field">
					<span class="field-label">Width (px)</span>
					<input bind:this={widthInput} type="number" min="1" max={MAX_DIMENSION} bind:value={width} />
				</label>
				<label class="field">
					<span class="field-label">Height (px)</span>
					<input type="number" min="1" max={MAX_DIMENSION} bind:value={height} />
				</label>
			</div>

			<div>
				<span class="field-label">Presets</span>
				<div class="mt-1 flex flex-wrap gap-1.5">
					{#each presets as p (p.label)}
						<button class="preset-chip" onclick={() => applyPreset(p.w, p.h)}>{p.label}</button>
					{/each}
				</div>
			</div>

			<div>
				<span class="field-label">Background</span>
				<div class="mt-1 flex items-center gap-4">
					<label class="radio"><input type="radio" bind:group={background} value="transparent" /> Transparent</label>
					<label class="radio"><input type="radio" bind:group={background} value="white" /> White</label>
					<label class="radio">
						<input type="radio" bind:group={background} value="custom" /> Custom
						{#if background === 'custom'}
							<input type="color" bind:value={customColor} class="ml-2 h-6 w-8 align-middle" />
						{/if}
					</label>
				</div>
			</div>

			<div class="text-xs" style="color:#9a9a9a;">
				~{formatBytes(bytes)} per layer &middot; background: <span style="color:#e0e0e0;">{selectedBg}</span>
				&middot; limit: {MAX_PIXELS.toLocaleString()} px
			</div>

			{#if !validation.ok}
				<div class="error-box">{validation.error}</div>
			{/if}
		</div>

		<div class="dialog-footer">
			<button class="btn-secondary" onclick={() => closeDialog()}>Cancel</button>
			<button class="btn-primary" disabled={!validation.ok} onclick={create}>Create</button>
		</div>
	</div>
</div>
