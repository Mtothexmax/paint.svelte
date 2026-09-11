<script lang="ts">
	// Layer: components/canvas. The eyedropper's live readout: a small panel that
	// trails the pointer and reports the composited pixel under it — a swatch of
	// the colour itself plus its R / G / B and A values.
	//
	// Purely presentational: EditorCanvas owns the sampling and passes the colour
	// in. `color === null` means the pointer is over the canvas but outside the
	// document (nothing to sample).
	import { rgbaToCss, rgbaToHex } from '../../core/color';
	import type { RGBA } from '../../core/color';

	let {
		x,
		y,
		hostW,
		hostH,
		color
	}: { x: number; y: number; hostW: number; hostH: number; color: RGBA | null } = $props();

	/** Panel box, kept in sync with the CSS below for edge clamping. */
	const W = 168;
	const H = 64;
	/** Gap between the hotspot and the panel. */
	const OFFSET = 18;

	// Trail the pointer, but never let the panel leave the canvas: flip/stop at
	// the edges instead of sliding out of view.
	const left = $derived(Math.max(4, Math.min(x + OFFSET, Math.max(4, hostW - W - 4))));
	const top = $derived(Math.max(4, Math.min(y + OFFSET, Math.max(4, hostH - H - 4))));

	const swatch = $derived(color ? rgbaToCss(color) : 'transparent');
	const alphaPct = $derived(color ? Math.round((color.a / 255) * 100) : 0);
</script>

<div class="probe-hud" style="left:{left}px; top:{top}px; width:{W}px;">
	<div class="probe-swatch" aria-hidden="true">
		{#if color}<span class="probe-fill" style="background:{swatch};"></span>{/if}
	</div>
	<div class="probe-read">
		{#if color}
			<div class="probe-row">
				<span class="probe-k">R</span><span class="probe-v">{color.r}</span>
				<span class="probe-k">G</span><span class="probe-v">{color.g}</span>
				<span class="probe-k">B</span><span class="probe-v">{color.b}</span>
			</div>
			<div class="probe-row">
				<span class="probe-k">A</span><span class="probe-v">{color.a}</span>
				<span class="probe-pct">{alphaPct}%</span>
			</div>
			<div class="probe-hex">{rgbaToHex(color)}</div>
		{:else}
			<div class="probe-row"><span class="probe-dim">Outside the canvas</span></div>
			<div class="probe-row"><span class="probe-k">R</span><span class="probe-v">—</span><span class="probe-k">G</span><span class="probe-v">—</span><span class="probe-k">B</span><span class="probe-v">—</span></div>
			<div class="probe-row"><span class="probe-k">A</span><span class="probe-v">—</span></div>
		{/if}
	</div>
</div>

<style>
	.probe-hud {
		position: absolute;
		z-index: 45;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: 5px;
		border: 1px solid #555;
		background: rgba(24, 24, 24, 0.94);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
		/* Must never eat the pointer — the canvas keeps receiving moves. */
		pointer-events: none;
		font-size: 11px;
		line-height: 1.3;
		color: var(--text);
	}

	/* Checkerboard behind the swatch so partial alpha is obvious. */
	.probe-swatch {
		flex: 0 0 auto;
		width: 34px;
		height: 34px;
		border-radius: 4px;
		border: 1px solid #666;
		overflow: hidden;
		background-color: #2f2f2f;
		background-image:
			linear-gradient(45deg, #4a4a4a 25%, transparent 25%, transparent 75%, #4a4a4a 75%),
			linear-gradient(45deg, #4a4a4a 25%, transparent 25%, transparent 75%, #4a4a4a 75%);
		background-size: 10px 10px;
		background-position: 0 0, 5px 5px;
		position: relative;
	}
	.probe-fill {
		position: absolute;
		inset: 0;
		display: block;
	}

	.probe-read {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.probe-row {
		display: flex;
		align-items: baseline;
		gap: 4px;
		white-space: nowrap;
	}
	.probe-k {
		color: var(--text-dim);
		font-weight: 600;
	}
	.probe-v {
		color: #fff;
		min-width: 24px;
		/* Tabular figures so the panel does not jitter as digits change. */
		font-variant-numeric: tabular-nums;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	}
	.probe-pct {
		color: var(--text-dim);
		font-variant-numeric: tabular-nums;
	}
	.probe-hex {
		color: var(--text-dim);
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-variant-numeric: tabular-nums;
	}
	.probe-dim {
		color: var(--text-dim);
	}
</style>
