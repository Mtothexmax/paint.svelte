<script lang="ts">
	// Canvas overlay for the shapes tool: live outline of the drag bounding
	// box. Fully derived from the draft + view + options stores, no events.
	import { imageToScreen } from '../../render/Viewport';
	import { rectFromCorners } from '../../core/geometry';
	import { shapeKind, shapeWidth, shapeLineStyle, shapeDrawStyle } from '../../state/shapes';
	import { foregroundColor, backgroundColor } from '../../state/ui';
	import { shapePolygonPoints } from '../../render/shapes';
	import { rgbaToCss } from '../../core/color';
	import type { ViewState } from '../../core/document/ImageDocument';

	interface ShapeDraft {
		startX: number;
		startY: number;
		curX: number;
		curY: number;
		swap: boolean;
	}

	interface Props {
		draft: ShapeDraft;
		view: ViewState;
	}

	let { draft, view }: Props = $props();

	const sr = $derived(rectFromCorners({ x: draft.startX, y: draft.startY }, { x: draft.curX, y: draft.curY }));
	const sp0 = $derived(imageToScreen(view, sr.x, sr.y));
	const szw = $derived(Math.max(view.zoom, 1e-4));
	const ssw = $derived(Math.max(sr.width * szw, 0.01));
	const ssh = $derived(Math.max(sr.height * szw, 0.01));
	const slw = $derived(Math.max($shapeWidth * szw, 0.5));
	const sfill = $derived($shapeDrawStyle === 'outline' ? 'none' : rgbaToCss(draft.swap ? $foregroundColor : $backgroundColor));
	const sstroke = $derived($shapeDrawStyle === 'fill' ? 'none' : rgbaToCss(draft.swap ? $backgroundColor : $foregroundColor));
	const sdash = $derived($shapeLineStyle === 'dashed' ? `${3 * slw} ${2 * slw}` : $shapeLineStyle === 'dotted' ? `0.1 ${1.6 * slw}` : 'none');
</script>

<svg
	class="pointer-events-none absolute z-30"
	style="left:{sp0.x}px; top:{sp0.y}px; overflow:visible;"
	width={ssw}
	height={ssh}
>
	{#if $shapeKind === 'rectangle'}
		<rect
			x="0"
			y="0"
			width={ssw}
			height={ssh}
			fill={sfill}
			stroke={sstroke}
			stroke-width={slw}
			stroke-dasharray={sdash}
			stroke-linejoin="round"
			stroke-linecap={$shapeLineStyle === 'dotted' ? 'round' : 'butt'}
		/>
	{:else if $shapeKind === 'rounded-rect'}
		<rect
			x="0"
			y="0"
			width={ssw}
			height={ssh}
			rx={Math.min(ssw, ssh) * 0.25}
			fill={sfill}
			stroke={sstroke}
			stroke-width={slw}
			stroke-dasharray={sdash}
			stroke-linejoin="round"
			stroke-linecap={$shapeLineStyle === 'dotted' ? 'round' : 'butt'}
		/>
	{:else if $shapeKind === 'ellipse'}
		<ellipse
			cx={ssw / 2}
			cy={ssh / 2}
			rx={ssw / 2}
			ry={ssh / 2}
			fill={sfill}
			stroke={sstroke}
			stroke-width={slw}
			stroke-dasharray={sdash}
			stroke-linecap={$shapeLineStyle === 'dotted' ? 'round' : 'butt'}
		/>
	{:else}
		{@const spts = shapePolygonPoints($shapeKind, 0, 0, ssw, ssh)
			.map((p) => `${p.x},${p.y}`)
			.join(' ')}
		<polygon
			points={spts}
			fill={sfill}
			stroke={sstroke}
			stroke-width={slw}
			stroke-dasharray={sdash}
			stroke-linejoin="round"
			stroke-linecap={$shapeLineStyle === 'dotted' ? 'round' : 'butt'}
		/>
	{/if}
</svg>