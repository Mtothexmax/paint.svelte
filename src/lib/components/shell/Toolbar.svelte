<script lang="ts">
	// Layer: components. Vertical colourful tool buttons (visual active-state only).
	import paintbrushSvg from '@fluentui-emoji/svg/icons/flat/paintbrush.svg';
	import bucketSvg from '@fluentui-emoji/svg/icons/flat/bucket.svg';
	import wandSvg from '@fluentui-emoji/svg/icons/flat/magic-wand.svg';
	import dropletSvg from '@fluentui-emoji/svg/icons/flat/droplet.svg';
	import rulerSvg from '@fluentui-emoji/svg/icons/flat/straight-ruler.svg';
	import moveSvg from '@fluentui-emoji/svg/icons/flat/left-right-arrow.svg';
	import lassoIcon from '../../assets/lasso.svg';

	import { activeToolId } from '../../state/ui';

	interface ToolConfig {
		id: string;
		label: string;
		src?: string;
		glyph?: string;
		group: number;
	}

	const tools: ToolConfig[] = [
		{ id: 'move', label: 'Move', src: moveSvg, group: 1 },
		{ id: 'brush', label: 'Brush', src: paintbrushSvg, group: 2 },
		{ id: 'pencil', label: 'Pencil', glyph: '✏️', group: 2 },
		{ id: 'eraser', label: 'Eraser', glyph: '🧽', group: 2 },
		{ id: 'eyedropper', label: 'Eyedropper', src: dropletSvg, group: 2 },
		{ id: 'select-rect', label: 'Rect Select', glyph: '🔲', group: 3 },
		{ id: 'select-ellipse', label: 'Ellipse Select', glyph: '⭕', group: 3 },
		{ id: 'lasso', label: 'Lasso Select', src: lassoIcon, group: 3 },
		{ id: 'wand', label: 'Magic Wand', src: wandSvg, group: 3 },
		{ id: 'bucket', label: 'Paint Bucket', src: bucketSvg, group: 4 },
		{ id: 'shape', label: 'Shapes', src: rulerSvg, group: 5 },
		{ id: 'text', label: 'Text', glyph: '🅰️', group: 5 },
		{ id: 'gradient', label: 'Gradient', glyph: '🌈', group: 5 }
	];

	// Compute separators between groups.
	const rendered = tools.map((tool, i) => ({
		tool,
		sep: i > 0 && tool.group !== tools[i - 1].group
	}));
</script>

<div
		class="grid w-full content-start select-none"
	style="grid-template-columns:repeat(2, 40px); justify-content:center; gap:4px; padding:4px;"
>
	{#each rendered as { tool, sep } (tool.id)}
		{#if sep}<div class="tool-sep col-span-2"></div>{/if}
		<button
			class="tool-btn"
			class:active={$activeToolId === tool.id}
			title={tool.label}
			aria-label={tool.label}
			onclick={() => {
				console.log('[toolbar] click →', tool.id, '(was', $activeToolId + ')');
				activeToolId.set(tool.id);
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
