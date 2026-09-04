<script lang="ts">
	// Layer: components. Tool Options strip — shows settings for the active tool.
	// Brush tools: Paint.NET-style sliders + anti-alias toggle. Selection tools:
	// a Replace/Add/Subtract mode switch; the lasso family additionally exposes a
	// Freehand/Polygon mode switch and a Finish action while drawing a polygon.
	import {
		activeToolId,
		brushSize,
		brushOpacity,
		brushHardness,
		brushSpacing,
		antiAliasMode,
		selectionMode,
		selectionRatio,
		selectionFixedRatio,
		selectionFixedSize
	} from '../../state/ui';
	import { get } from 'svelte/store';
	import { requestPolygonFinish } from '../../state/polygon';
	import PdnSlider from '../common/PdnSlider.svelte';
	import IconSplitButton from '../common/IconSplitButton.svelte';

	const paintTools = new Set(['brush', 'pencil', 'eraser']);
	const isPaint = $derived(paintTools.has($activeToolId));

	const selectionTools = new Set(['select-rect', 'select-ellipse', 'lasso', 'select-poly']);
	const isSelection = $derived(selectionTools.has($activeToolId));

	// Lasso family: Freehand lasso ('lasso') or Polygon lasso ('select-poly').
	const lassoTools = new Set(['lasso', 'select-poly']);
	const isLasso = $derived(lassoTools.has($activeToolId));

	const AA_OPTIONS = [
		{
			id: 'pixel',
			icon: '🔲',
			label: 'Pixel-Perfect',
			description: 'Hard pixel edges — no anti-aliasing when painting'
		},
		{
			id: 'smooth',
			icon: '◐',
			label: 'Smooth',
			description: 'Soft anti-aliased edges (uses hardness)'
		}
	];

	const RATIO_OPTIONS = [
		{
			id: 'normal',
			icon: '⛶',
			label: 'Free Ratio',
			description: 'Unconstrained rectangle size'
		},
		{
			id: 'fixedRatio',
			icon: '⬚',
			label: 'Fixed Ratio',
			description: 'Keep a fixed width-to-height ratio'
		},
		{
			id: 'fixedSize',
			icon: '▣',
			label: 'Fixed Size',
			description: 'Always select the same size'
		}
	];

	let aa = $state<string>('pixel');
	$effect(() => {
		aa = get(antiAliasMode);
	});
	$effect(() => {
		antiAliasMode.set(aa as 'pixel' | 'smooth');
	});

	let ratio = $state<string>('normal');
	$effect(() => {
		ratio = get(selectionRatio);
	});
	$effect(() => {
		selectionRatio.set(ratio as 'normal' | 'fixedRatio' | 'fixedSize');
	});

	function setSizeField(
		store: 'ratio' | 'size',
		key: 'width' | 'height',
		raw: string
	): void {
		const n = Math.max(1, Math.round(parseFloat(raw) || 0));
		if (store === 'ratio') selectionFixedRatio.update((o) => ({ ...o, [key]: n }));
		else selectionFixedSize.update((o) => ({ ...o, [key]: n }));
	}
</script>

	<div class="flex h-full w-full items-center gap-4 px-2 text-xs select-none" style="color:var(--text-dim);">
	{#if isPaint}
		<PdnSlider label="Size" min={1} max={300} step={1} bind:value={$brushSize} />
		<PdnSlider label="Opacity" min={0} max={100} step={1} unit="%" bind:value={$brushOpacity} />
		<PdnSlider label="Hardness" min={0} max={100} step={1} unit="%" bind:value={$brushHardness} />
		<PdnSlider label="Spacing" min={1} max={300} step={1} unit="%" bind:value={$brushSpacing} />
		<span class="aa-label">Anti-alias:</span>
		<IconSplitButton options={AA_OPTIONS} bind:value={aa} title="Anti-aliased rendering" />
	{:else if isSelection}
		<span class="aa-label">Mode:</span>
		<div class="seg">
			<button
				class="seg-btn"
				class:on={$selectionMode === 'replace'}
				title="Replace the selection"
				onclick={() => selectionMode.set('replace')}
			>
				⛶ Replace
			</button>
			<button
				class="seg-btn"
				class:on={$selectionMode === 'add'}
				title="Add to the selection"
				onclick={() => selectionMode.set('add')}
			>
				+ Add
			</button>
			<button
				class="seg-btn"
				class:on={$selectionMode === 'subtract'}
				title="Subtract from the selection"
				onclick={() => selectionMode.set('subtract')}
			>
				− Subtract
			</button>
		</div>
		{#if $activeToolId === 'select-rect'}
			<span class="aa-label">Ratio:</span>
			<IconSplitButton
				options={RATIO_OPTIONS}
				titleInButton
				bind:value={ratio}
				title="Rectangle aspect ratio"
			/>
			{#if ratio === 'fixedRatio'}
				<span class="aa-label">W:</span>
				<input
					class="fsl-num"
					type="number"
					min="1"
					step="1"
					value={$selectionFixedRatio.width}
					onchange={(e) => setSizeField('ratio', 'width', (e.currentTarget as HTMLInputElement).value)}
				/>
				<span class="aa-label">H:</span>
				<input
					class="fsl-num"
					type="number"
					min="1"
					step="1"
					value={$selectionFixedRatio.height}
					onchange={(e) => setSizeField('ratio', 'height', (e.currentTarget as HTMLInputElement).value)}
				/>
			{:else if ratio === 'fixedSize'}
				<span class="aa-label">W:</span>
				<input
					class="fsl-num"
					type="number"
					min="1"
					step="1"
					value={$selectionFixedSize.width}
					onchange={(e) => setSizeField('size', 'width', (e.currentTarget as HTMLInputElement).value)}
				/>
				<span class="aa-label">H:</span>
				<input
					class="fsl-num"
					type="number"
					min="1"
					step="1"
					value={$selectionFixedSize.height}
					onchange={(e) => setSizeField('size', 'height', (e.currentTarget as HTMLInputElement).value)}
				/>
			{/if}
		{/if}
		{#if isLasso}
			<span class="aa-label">Tool:</span>
			<div class="seg">
				<button
					class="seg-btn"
					class:on={$activeToolId === 'lasso'}
					onclick={() => activeToolId.set('lasso')}
				>
					Freehand
				</button>
				<button
					class="seg-btn"
					class:on={$activeToolId === 'select-poly'}
					onclick={() => activeToolId.set('select-poly')}
				>
					Polygon
				</button>
			</div>
			{#if $activeToolId === 'select-poly'}
				<button class="mini-btn" onclick={requestPolygonFinish} title="Finish the polygon selection">
					✓ Finish
				</button>
			{/if}
		{/if}
	{:else}
		<span class="tooloptions-placeholder">No tool options for the selected tool yet.</span>
	{/if}
</div>
