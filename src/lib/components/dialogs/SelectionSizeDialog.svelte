<script lang="ts">
	// Layer: components. Exact selection size — opened by clicking the selection
	// read-out in the status bar, so a marquee can be sized numerically instead
	// of dragged to the right pixel.
	//
	// Non-modal on purpose (MovableDialog): the selection stays visible and the
	// canvas stays interactive, so you can watch the ants jump as you apply.
	import { onMount } from 'svelte';
	import MovableDialog from '../common/MovableDialog.svelte';
	import { closeDialog } from '../../services/dialogService';
	import { documentRegistry } from '../../core/document/registry';
	import { setRectSelection } from '../../services/selectionService';

	const doc = documentRegistry.active;
	const sel = doc?.selection;

	/** Where the new selection sits: the live selection box, else the whole
	 * document. The top-left corner is kept — that is the predictable anchor
	 * when only a size is being typed. */
	function startRect(): { x: number; y: number; w: number; h: number } {
		const b = sel?.active ? (sel.bounds ?? sel.rect ?? null) : null;
		if (b) {
			return {
				x: Math.max(0, Math.round(b.x)),
				y: Math.max(0, Math.round(b.y)),
				w: Math.max(1, Math.round(b.width)),
				h: Math.max(1, Math.round(b.height))
			};
		}
		return { x: 0, y: 0, w: doc?.width ?? 1, h: doc?.height ?? 1 };
	}
	const start = startRect();

	/** Only rect/ellipse have a size of their own. A lasso/polygon selection is
	 * stored as a point list, so re-sizing it yields a rectangle. */
	const kind: 'rect' | 'ellipse' = sel?.kind === 'ellipse' ? 'ellipse' : 'rect';

	let width = $state(start.w);
	let height = $state(start.h);
	let widthEl = $state<HTMLInputElement | null>(null);

	// The selection must stay on the canvas, so the largest sizeable box is
	// whatever still fits to the right of / below the anchor.
	const maxW = Math.max(1, (doc?.width ?? 1) - start.x);
	const maxH = Math.max(1, (doc?.height ?? 1) - start.y);

	function clampInt(v: number, min: number, max: number): number {
		const n = Math.round(Number(v));
		if (!Number.isFinite(n)) return min;
		return Math.max(min, Math.min(max, n));
	}

	const w = $derived(clampInt(width, 1, maxW));
	const h = $derived(clampInt(height, 1, maxH));
	/** True when a typed number had to be pulled back to fit the canvas. */
	const clamped = $derived(w !== Math.round(Number(width)) || h !== Math.round(Number(height)));

	function apply(): void {
		if (!doc) {
			closeDialog();
			return;
		}
		if (setRectSelection(kind, { x: start.x, y: start.y }, { x: start.x + w, y: start.y + h })) {
			closeDialog();
		}
	}

	function onKey(e: KeyboardEvent): void {
		if (e.key !== 'Enter') return;
		// Leave a focused button to its own click handler.
		if ((e.target as HTMLElement)?.tagName === 'BUTTON') return;
		e.preventDefault();
		apply();
	}

	onMount(() => {
		// Opened to type numbers — put the caret there straight away.
		queueMicrotask(() => {
			widthEl?.focus();
			widthEl?.select();
		});
	});
</script>

<svelte:window onkeydown={onKey} />

<MovableDialog title="Selection Size" onClose={closeDialog} width={330}>
	{#if !doc}
		<p class="ss-empty">No document is open.</p>
	{:else}
		<div class="ss-grid">
			<label class="field">
				<span class="field-label">Width (px)</span>
				<input type="number" min="1" max={maxW} bind:this={widthEl} bind:value={width} />
			</label>
			<label class="field">
				<span class="field-label">Height (px)</span>
				<input type="number" min="1" max={maxH} bind:value={height} />
			</label>
		</div>
		<p class="ss-hint">
			{w} × {h} px at ({start.x}, {start.y}){#if clamped}<span class="ss-clamp"
					>&nbsp;· clamped to the canvas</span
				>{/if}
		</p>
	{/if}

	{#snippet actions()}
		<button class="btn-secondary" onclick={closeDialog}>Cancel</button>
		<button class="btn-primary" disabled={!doc} onclick={apply}>Apply</button>
	{/snippet}
</MovableDialog>

<style>
	.ss-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.ss-hint {
		margin: 10px 0 0;
		font-size: 12px;
		color: #9a9a9a;
	}
	/* A typed number was pulled back to keep the selection on the canvas —
	   worth flagging, since the applied size then differs from what was typed. */
	.ss-clamp {
		color: #fdd663;
	}
	.ss-empty {
		margin: 0;
		font-size: 13px;
		color: #9a9a9a;
	}
</style>
