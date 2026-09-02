<script lang="ts">
	// Layer: components. Tool Options strip — shows settings for the active tool
	// with Paint.NET-style sliders. The brush tools additionally expose an
	// anti-aliased rendering toggle (IconSplitButton).
	import { activeToolId, brushSize, brushOpacity, brushHardness, brushSpacing, antiAliasMode } from '../../state/ui';
	import { get } from 'svelte/store';
	import PdnSlider from '../common/PdnSlider.svelte';
	import IconSplitButton from '../common/IconSplitButton.svelte';

	const paintTools = new Set(['brush', 'pencil', 'eraser']);
	const isPaint = $derived(paintTools.has($activeToolId));

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
	{:else}
		<span class="tooloptions-placeholder">No tool options for the selected tool yet.</span>
	{/if}
</div>
