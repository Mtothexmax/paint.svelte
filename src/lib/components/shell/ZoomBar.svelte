<script lang="ts">
	// Layer: components. Bottom-right zoom bar (Paint.NET style): Fit to Window,
	// 1:1 (100%), step zoom, a logarithmic zoom slider and a zoom % readout that
	// on click zooms to 100% and re-centres the document.
	import './ZoomBar.css';
	import { getEditorRenderer, hasEditorRenderer } from '../../render/EditorRenderer';
	import { zoomTo, fitView } from '../../render/Viewport';
	import { documentRegistry } from '../../core/document/registry';
	import { statusBar } from '../../state/ui';
	import { documents } from '../../state/documents';
	import { ZOOM_MIN, ZOOM_MAX } from '../../core/limits';

	const MIN = ZOOM_MIN * 100; // 1%
	const MAX = ZOOM_MAX * 100; // 3200%
	const LOG_MIN = Math.log(MIN);
	const LOG_MAX = Math.log(MAX);

	const hasDoc = $derived($documents.docs.length > 0);

	/** pct (1..3200) -> slider position 0..1 (logarithmic). */
	function toT(pct: number): number {
		if (pct <= MIN) return 0;
		if (pct >= MAX) return 1;
		return (Math.log(pct) - LOG_MIN) / (LOG_MAX - LOG_MIN);
	}
	function toPct(t: number): number {
		return Math.round(Math.exp(LOG_MIN + t * (LOG_MAX - LOG_MIN)));
	}

	const zoomPct = $derived($statusBar.zoomPct ?? 100);
	const sliderPos = $derived(Math.round(toT(zoomPct) * 1000));

	function applyZoom(pct: number): void {
		const doc = documentRegistry.active;
		if (!doc || !hasEditorRenderer()) return;
		const renderer = getEditorRenderer();
		const target = Math.max(MIN, Math.min(MAX, pct)) / 100;
		doc.view = zoomTo(doc.view, { x: renderer.viewWidth / 2, y: renderer.viewHeight / 2 }, target);
		renderer.refreshActiveView();
		statusBar.update((s) => ({ ...s, zoomPct: Math.round(doc.view.zoom * 100) }));
	}

	/** Zoom + re-centre the document inside the viewport. */
	function centerAt(pct: number): void {
		const doc = documentRegistry.active;
		if (!doc || !hasEditorRenderer()) return;
		const renderer = getEditorRenderer();
		const z = Math.max(MIN, Math.min(MAX, pct)) / 100;
		doc.view = {
			zoom: z,
			panX: renderer.viewWidth / 2 - (doc.width * z) / 2,
			panY: renderer.viewHeight / 2 - (doc.height * z) / 2
		};
		renderer.refreshActiveView();
		statusBar.update((s) => ({ ...s, zoomPct: Math.round(z * 100) }));
	}

	function fitWindow(): void {
		const doc = documentRegistry.active;
		if (!doc || !hasEditorRenderer()) return;
		const renderer = getEditorRenderer();
		doc.view = fitView(doc.width, doc.height, renderer.viewWidth, renderer.viewHeight);
		renderer.refreshActiveView();
		statusBar.update((s) => ({ ...s, zoomPct: Math.round(doc.view.zoom * 100) }));
	}

	function onSliderInput(e: Event): void {
		applyZoom(toPct(Number((e.currentTarget as HTMLInputElement).value) / 1000));
	}
	/** Keep arrow keys on the slider out of the canvas nudge handler. */
	function onSliderKey(e: KeyboardEvent): void {
		e.stopPropagation();
	}
	function onClick(): void {
		centerAt(100);
	}
</script>

<div class="zoombar" aria-label="Zoom">
	<button type="button" class="zb-btn" title="Fit to Window (Ctrl+0)" disabled={!hasDoc} onclick={fitWindow}>⛶</button>
	<button type="button" class="zb-btn" title="Zoom Out (Ctrl+-)" disabled={!hasDoc} onclick={() => applyZoom(zoomPct / 1.2)}>−</button>
	<input
		type="range"
		class="zb-slider"
		aria-label="Zoom"
		min="0"
		max="1000"
		step="1"
		value={sliderPos}
		disabled={!hasDoc}
		title="Double-click to reset to 100%"
		oninput={onSliderInput}
		onpointerdown={(e) => (e.currentTarget as HTMLElement)?.blur()}
		ondblclick={onClick}
		onkeydown={onSliderKey}
	/>
	<button type="button" class="zb-btn" title="Zoom In (Ctrl+=)" disabled={!hasDoc} onclick={() => applyZoom(zoomPct * 1.2)}>+</button>
	<button
		type="button"
		class="zb-btn zb-pct"
		title="Zoom to 100% and centre"
		disabled={!hasDoc}
		onclick={onClick}
	>{zoomPct}%</button>
</div>