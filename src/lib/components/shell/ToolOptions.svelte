<script lang="ts">
	// Layer: components. Tool Options strip — shows settings for the active tool.
	// Slice 2: brush / pencil / eraser expose size / opacity / hardness.
	import { activeToolId, brushSize, brushOpacity, brushHardness } from '../../state/ui';

	const labels: Record<string, string> = {
		move: 'Move Tool',
		brush: 'Brush Tool',
		pencil: 'Pencil Tool',
		eraser: 'Eraser Tool',
		eyedropper: 'Eyedropper Tool',
		'select-rect': 'Rectangle Select',
		'select-ellipse': 'Ellipse Select',
		lasso: 'Lasso Select',
		wand: 'Magic Wand',
		bucket: 'Paint Bucket',
		shape: 'Shapes',
		text: 'Text Tool',
		gradient: 'Gradient Tool'
	};

	const paintTools = new Set(['brush', 'pencil', 'eraser']);
	const isPaint = $derived(paintTools.has($activeToolId));
</script>

<div class="flex h-full w-full items-center gap-4 px-2 text-xs" style="color:var(--text-dim);">
	<span class="font-semibold whitespace-nowrap" style="color:var(--text);">{labels[$activeToolId] ?? $activeToolId}</span>

	{#if isPaint}
		<label class="opt-field">
			<span>Size</span>
			<input type="range" min="1" max="300" bind:value={$brushSize} />
			<span class="opt-val">{$brushSize}</span>
		</label>
		<label class="opt-field">
			<span>Opacity</span>
			<input type="range" min="0" max="100" step="1" bind:value={$brushOpacity} />
			<span class="opt-val">{$brushOpacity}%</span>
		</label>
		<label class="opt-field">
			<span>Hardness</span>
			<input type="range" min="0" max="100" step="1" bind:value={$brushHardness} />
			<span class="opt-val">{$brushHardness}%</span>
		</label>
	{:else}
		<span class="tooloptions-placeholder">No tool options for the selected tool yet.</span>
	{/if}
</div>
