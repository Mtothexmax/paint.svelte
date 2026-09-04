<script lang="ts">
	// Layer: components. Vertical colourful tool buttons (visual active-state only).
	// The order/columns match the Paint.NET left toolbar: the left column lists
	// the shape/selection/paint tools and the right column lists the move/utility
	// tools. Missing Paint.NET tools (Zoom, Pan, Clone Stamp, Recolor, Line/Curve)
	// are present as placeholders so the visual layout stays in sync; they switch
	// the active tool but no behaviour is wired up yet.
	import paintbrushSvg from '@fluentui-emoji/svg/icons/flat/paintbrush.svg';
	import bucketSvg from '@fluentui-emoji/svg/icons/flat/bucket.svg';
	import wandSvg from '@fluentui-emoji/svg/icons/flat/magic-wand.svg';
	import ShapesIcon from '../../assets/Shapes.svg';
	import moveSvg from '../../assets/MoveSelectedPixels.svg';
	import moveSelectionIcon from '../../assets/MoveSelection.svg';
	import lassoIcon from '../../assets/lasso.svg';
	import CloneBrushIcon from '../../assets/CloneBrush.svg';
	import RecolorIcon from '../../assets/ColorTransfer.svg';
	import ColorPickerIcon from '../../assets/ColorPicker.svg';
	import GradientFillIcon from '../../assets/GradientFill.svg';
	import EraserIcon from '../../assets/Eraser.svg';
	import TextIcon from '../../assets/Text.svg';
	import zoomSvg from '@fluentui-emoji/svg/icons/flat/magnifying-glass-tilted-left.svg';
	import panSvg from '@fluentui-emoji/svg/icons/flat/hand-with-fingers-splayed-default.svg';
	import curlySvg from '../../assets/Line.svg';

	import { activeToolId, showNotice } from '../../state/ui';
	import ToolbarColorPicker from './ToolbarColorPicker.svelte';

	interface ToolConfig {
		id: string;
		label: string;
		src?: string;
		glyph?: string;
		/** When true the tool is not implemented yet — clicking it just shows a notice. */
		placeholder?: boolean;
	}

	// Order matches the Paint.NET toolbar (left column then right column, row by row).
	// The 2-column CSS grid fills in this order so the layout falls out automatically.
	const tools: ToolConfig[] = [
		// Row 1
		{ id: 'select-rect', label: 'Rectangle Select', glyph: '▭' },
		{ id: 'move-pixels', label: 'Move Selected Pixels', src: moveSvg },
		// Row 2
		{ id: 'lasso', label: 'Lasso Select', src: lassoIcon },
		{ id: 'move-selection', label: 'Move Selection', src: moveSelectionIcon },
		// Row 3
		{ id: 'select-ellipse', label: 'Ellipse Select', glyph: '◯' },
		{ id: 'zoom', label: 'Zoom', src: zoomSvg },
		// Row 4
		{ id: 'wand', label: 'Magic Wand', src: wandSvg },
		{ id: 'pan', label: 'Pan', src: panSvg },
		// Row 5
		{ id: 'bucket', label: 'Paint Bucket', src: bucketSvg },
		{ id: 'gradient', label: 'Gradient', src: GradientFillIcon },
		// Row 6
		{ id: 'brush', label: 'Paintbrush', src: paintbrushSvg },
		{ id: 'eraser', label: 'Eraser', src: EraserIcon },
		// Row 7
		{ id: 'pencil', label: 'Pencil', glyph: '✏️' },
		{ id: 'eyedropper', label: 'Color Picker', src: ColorPickerIcon },
		// Row 8
		{ id: 'clone-stamp', label: 'Clone Stamp', src: CloneBrushIcon, placeholder: true },
		{ id: 'recolor', label: 'Recolor', src: RecolorIcon, placeholder: true },
		// Row 9
		{ id: 'text', label: 'Text', src: TextIcon },
		{ id: 'line', label: 'Line / Curve', src: curlySvg, placeholder: true },
		// Row 10 (Shapes sits alone in the left column, like Paint.NET).
		{ id: 'shape', label: 'Shapes', src: ShapesIcon }
	];

	function pickTool(id: string, label: string, placeholder?: boolean): void {
		if (placeholder) {
			showNotice(`${label} is not implemented yet.`, 'info');
		}
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
				type="button"
				tabindex="-1"
				class="tool-btn"
				class:active={$activeToolId === tool.id}
				class:placeholder={tool.placeholder}
				title={tool.placeholder ? `${tool.label} (placeholder)` : tool.label}
				aria-label={tool.label}
				onmousedown={(event) => event.preventDefault()}
				onfocus={(event) => event.currentTarget.blur()}
				onclick={() => {
					console.log('[toolbar] click →', tool.id, '(was', $activeToolId + ')');
					pickTool(tool.id, tool.label, tool.placeholder);
					(document.activeElement as HTMLElement | null)?.blur();
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
	<ToolbarColorPicker />
</div>

<style>
	/* Placeholder tools (not yet implemented) are rendered with reduced opacity
	   so the user can tell at a glance which buttons are live. */
	:global(.tool-btn.placeholder) {
		opacity: 0.55;
	}
	:global(.tool-btn.placeholder:hover) {
		opacity: 0.85;
	}
</style>
