<script lang="ts">
	// Layer: components. Vertical colourful tool buttons (visual active-state only).
	import paintbrushSvg from '@fluentui-emoji/svg/icons/flat/paintbrush.svg';
	import bucketSvg from '@fluentui-emoji/svg/icons/flat/bucket.svg';
	import wandSvg from '@fluentui-emoji/svg/icons/flat/magic-wand.svg';
	import dropletSvg from '@fluentui-emoji/svg/icons/flat/droplet.svg';
	import rulerSvg from '@fluentui-emoji/svg/icons/flat/straight-ruler.svg';
	import moveSvg from '@fluentui-emoji/svg/icons/flat/left-right-arrow.svg';
	import lassoIcon from '../../assets/lasso.svg';
	import zoomSvg from '@fluentui-emoji/svg/icons/flat/magnifying-glass-tilted-left.svg';
	import panSvg from '@fluentui-emoji/svg/icons/flat/hand-with-fingers-splayed-default.svg';
	import curlySvg from '@fluentui-emoji/svg/icons/flat/curly-loop.svg';

	import { activeToolId, showNotice } from '../../state/ui';

	interface ToolConfig {
		id: string;
		label: string;
		src?: string;
		glyph?: string;
		placeholder?: boolean;
	}

	const tools: ToolConfig[] = [
			{ id: 'select-rect', label: 'Rectangle Select', glyph: '▭' },
			{ id: 'move', label: 'Move Selected Pixels', src: moveSvg },
			{ id: 'lasso', label: 'Lasso Select', src: lassoIcon },
			{ id: 'move-selection', label: 'Move Selection', glyph: '⤢', placeholder: true },
			{ id: 'select-ellipse', label: 'Ellipse Select', glyph: '◯' },
			{ id: 'zoom', label: 'Zoom', src: zoomSvg, placeholder: true },
			{ id: 'wand', label: 'Magic Wand', src: wandSvg },
			{ id: 'pan', label: 'Pan', src: panSvg, placeholder: true },
			{ id: 'bucket', label: 'Paint Bucket', src: bucketSvg },
			{ id: 'gradient', label: 'Gradient', glyph: '🌈' },
			{ id: 'brush', label: 'Paintbrush', src: paintbrushSvg },
			{ id: 'eraser', label: 'Eraser', glyph: '🧽' },
			{ id: 'pencil', label: 'Pencil', glyph: '✏️' },
			{ id: 'eyedropper', label: 'Color Picker', src: dropletSvg },
			{ id: 'clone-stamp', label: 'Clone Stamp', glyph: '🖌', placeholder: true },
			{ id: 'recolor', label: 'Recolor', glyph: '🎨', placeholder: true },
			{ id: 'text', label: 'Text', glyph: '🅰️' },
			{ id: 'line', label: 'Line / Curve', src: curlySvg, placeholder: true },
			{ id: 'shape', label: 'Shapes', src: rulerSvg }
	];

	function pickTool(id: string, label: string, placeholder?: boolean): void {
		if (placeholder) showNotice(`${label} is not implemented yet.`, 'info');
		activeToolId.set(id);
	}
</script>

<div class="toolbar-flex select-none">
	<div
	class="grid w-full flex-none content-start"
	style="grid-template-columns:repeat(2, 40px); justify-content:center; gap:4px; padding:4px;"
	>
	{#each tools as tool (tool.id)}
	<button
		class="tool-btn"
		class:active={$activeToolId === tool.id}
		class:placeholder={tool.placeholder}
		title={tool.placeholder ? `${tool.label} (placeholder)` : tool.label}
		aria-label={tool.label}
		onclick={() => {
			console.log('[toolbar] click →', tool.id, '(was', $activeToolId + ')');
			pickTool(tool.id, tool.label, tool.placeholder);
		}}
		>
			{#if tool.src}
				<img src={tool.src} alt={tool.label} class="h-6 w-6" draggable="false" />
			{:else}
				<span class="tool-glyph">{tool.glyph}</span>
			{/if}
		</button>
	{/each}
	</div>
</div>
