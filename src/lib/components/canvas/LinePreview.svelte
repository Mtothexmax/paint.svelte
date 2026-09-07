<script lang="ts">
	// Canvas overlay for the line tool: the cubic Bézier path with optional
	// arrow heads. Fully derived from the draft + view + options stores. The
	// draggable nubs stay in the host (they need its pointer handlers).
	import { imageToScreen } from '../../render/Viewport';
	import { arrowHeadLength, arrowHeadPoints } from '../../render/lines';
	import { rgbaToCss } from '../../core/color';
	import { foregroundColor, backgroundColor } from '../../state/ui';
	import type { Point } from '../../core/geometry';
	import type { ViewState } from '../../core/document/ImageDocument';
	import { lineWidth, lineStyle, lineArrowStart, lineArrowEnd } from '../../state/lines';

	interface LineDraft {
		p0: Point;
		p1: Point;
		p2: Point;
		p3: Point;
		swap: boolean;
		drawing: boolean;
	}

	interface Props {
		draft: LineDraft;
		view: ViewState;
	}

	let { draft, view }: Props = $props();

	const lzw = $derived(Math.max(view.zoom, 1e-4));
	const lq0 = $derived(imageToScreen(view, draft.p0.x, draft.p0.y));
	const lq1 = $derived(imageToScreen(view, draft.p1.x, draft.p1.y));
	const lq2 = $derived(imageToScreen(view, draft.p2.x, draft.p2.y));
	const lq3 = $derived(imageToScreen(view, draft.p3.x, draft.p3.y));
	const llw = $derived(Math.max($lineWidth * lzw, 0.5));
	const lcol = $derived(rgbaToCss(draft.swap ? $backgroundColor : $foregroundColor));
	const ldash = $derived($lineStyle === 'dashed' ? `${3 * llw} ${2 * llw}` : $lineStyle === 'dotted' ? `0.1 ${1.6 * llw}` : 'none');
	const lahLen = $derived(arrowHeadLength($lineWidth));
	const lah0 = $derived($lineArrowStart ? arrowHeadPoints(draft.p0, draft.p1, draft.p2, draft.p3, true, lahLen) : null);
	const lah3 = $derived($lineArrowEnd ? arrowHeadPoints(draft.p0, draft.p1, draft.p2, draft.p3, false, lahLen) : null);

	function arrowPoints(head: NonNullable<typeof lah0>): string {
		return head
			.map((p) => {
				const s = imageToScreen(view, p.x, p.y);
				return `${s.x},${s.y}`;
			})
			.join(' ');
	}
</script>

<svg class="pointer-events-none absolute inset-0 z-30 h-full w-full" style="overflow:visible;">
	<path
		d="M {lq0.x} {lq0.y} C {lq1.x} {lq1.y}, {lq2.x} {lq2.y}, {lq3.x} {lq3.y}"
		fill="none"
		stroke={lcol}
		stroke-width={llw}
		stroke-dasharray={ldash}
		stroke-linecap="round"
	/>
	{#if lah0}
		<polygon points={arrowPoints(lah0)} fill={lcol} />
	{/if}
	{#if lah3}
		<polygon points={arrowPoints(lah3)} fill={lcol} />
	{/if}
</svg>