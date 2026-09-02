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
		selectionMode
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

	let aa = $state<string>('pixel');
	$effect(() => {
		aa = get(antiAliasMode);
	});
	$effect(() => {
		antiAliasMode.set(aa as 'pixel' | 'smooth');
	});
</script>

<div class="flex h-full w-full items-center gap-4 px-2 text-xs" style="color:var(--text-dim);">
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
