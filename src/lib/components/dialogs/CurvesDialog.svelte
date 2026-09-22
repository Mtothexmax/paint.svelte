<script lang="ts">
	// Layer: components. Paint.NET-style Curves dialog: channel tabs (RGB / R / G / B),
	// SVG spline editor, live preview and apply via the same off-screen pipeline.
	import { onMount } from 'svelte';
	import MovableDialog from '../common/MovableDialog.svelte';
	import EffectBrowserMenu from '../common/EffectBrowserMenu.svelte';
	import SwitchIcon from '@material-symbols/svg-400/rounded/arrow_drop_down.svg';
	import PrevIcon from '@material-symbols/svg-400/rounded/chevron_left.svg';
	import NextIcon from '@material-symbols/svg-400/rounded/chevron_right.svg';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { ADJUSTMENTS_MENU, applyFilterSwap, effectById } from '../../effects';
	import {
		adjustmentDialogs,
		attachSwitcherDismiss,
		nextAdjustmentId,
		prevAdjustmentId,
		switchAdjustment
	} from './adjustmentSwitcher';
	import {
		curvesFilter,
		defaultCurveSet,
		evalCurve,
		type CurveChannel,
		type CurvePoint,
		type CurveSet
	} from '../../effects/adjustments/curves';
	import { closeDialog } from '../../services/dialogService';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import { rememberLastApplied } from '../../state/repeat';

	const CHANNELS: { key: CurveChannel; label: string; color: string }[] = [
		{ key: 'rgb', label: 'RGB', color: '#9ca3af' },
		{ key: 'r', label: 'R', color: '#ef4444' },
		{ key: 'g', label: 'G', color: '#22c55e' },
		{ key: 'b', label: 'B', color: '#3b82f6' }
	];

	let curve = $state<CurveSet>(getSettings<CurveSet>('effects.curves', structuredClone(defaultCurveSet)));
	let activeChannel = $state<CurveChannel>('rgb');
	let previewOn = $state(true);
	let draggingIndex = $state<number | null>(null);
	let svgEl = $state<SVGSVGElement | null>(null);
	let switcherOpen = $state(false);

	// ‹ › steppers cycle through dialog-based adjustments only (same order
	// as the ▾ switcher menu); the window is REPLACED, never stacked.
	const prevId = prevAdjustmentId('curves');
	const nextId = nextAdjustmentId('curves');
	const prevDef = effectById(prevId);
	const nextDef = effectById(nextId);

	function switchAdj(id: string): void {
		switcherOpen = false;
		if (id === 'curves') return;
		switchAdjustment(id);
	}

	function pointsFor(ch: CurveChannel): CurvePoint[] {
		return curve[ch];
	}

	function preview() {
		const r = getEditorRenderer();
		if (previewOn) r.setActiveLayerFilterPreview(curvesFilter(curve));
		else r.setActiveLayerFilterPreview(null);
	}

	function togglePreview() {
		preview();
	}

	function resetChannel() {
		curve = {
			...curve,
			[activeChannel]: [
				{ x: 0, y: 0 },
				{ x: 1, y: 1 }
			]
		};
		preview();
	}

	function apply() {
		const r = getEditorRenderer();
		r.setActiveLayerFilterPreview(null);
		if (applyFilterSwap(r, 'Curves', () => curvesFilter(curve))) {
			rememberLastApplied({
				menu: 'adjustments',
				name: 'Curves',
				apply: () => applyFilterSwap(getEditorRenderer(), 'Curves', () => curvesFilter(curve))
			});
			closeDialog();
		}
	}

	function cancel() {
		getEditorRenderer().setActiveLayerFilterPreview(null);
		closeDialog();
	}

	function toCurveSpace(e: PointerEvent): { x: number; y: number } {
		const rect = svgEl!.getBoundingClientRect();
		const sx = (e.clientX - rect.left) / rect.width;
		const sy = (e.clientY - rect.top) / rect.height;
		return { x: Math.max(0, Math.min(1, sx)), y: Math.max(0, Math.min(1, 1 - sy)) };
	}

	function findNearestIndex(pts: CurvePoint[], p: { x: number; y: number }): number {
		let best = -1;
		let bestD = Infinity;
		for (let i = 0; i < pts.length; i++) {
			const dx = pts[i].x - p.x;
			const dy = pts[i].y - (1 - p.y); // y is flipped in screen space
			const d = dx * dx + dy * dy;
			if (d < bestD) {
				bestD = d;
				best = i;
			}
		}
		return bestD < 0.0025 ? best : -1; // ~5% radius in normalised space
	}

	function insertAndGetIndex(pts: CurvePoint[], x: number): number {
		// Insert at the correct x-order position.
		let i = 0;
		for (; i < pts.length; i++) {
			if (x < pts[i].x) break;
		}
		pts.splice(i, 0, { x, y: evalCurve(pts, x) });
		return i;
	}

	function onPointerDown(e: PointerEvent) {
		if (!svgEl) return;
		const p = toCurveSpace(e);
		const pts = pointsFor(activeChannel);
		const idx = findNearestIndex(pts, p);
		if (idx >= 0) {
			draggingIndex = idx;
		} else {
			const newIdx = insertAndGetIndex(pts, p.x);
			curve = { ...curve, [activeChannel]: [...pts] };
			draggingIndex = newIdx;
		}
		svgEl.setPointerCapture(e.pointerId);
		preview();
	}

	function onPointerMove(e: PointerEvent) {
		if (draggingIndex == null || !svgEl) return;
		const p = toCurveSpace(e);
		const pts = pointsFor(activeChannel);
		const n = pts.length;
		if (draggingIndex === 0) {
			pts[0] = { x: 0, y: Math.max(0, Math.min(1, p.y)) };
		} else if (draggingIndex === n - 1) {
			pts[n - 1] = { x: 1, y: Math.max(0, Math.min(1, p.y)) };
		} else {
			const prevX = pts[draggingIndex - 1].x + 0.01;
			const nextX = pts[draggingIndex + 1].x - 0.01;
			pts[draggingIndex] = {
				x: Math.max(prevX, Math.min(nextX, p.x)),
				y: Math.max(0, Math.min(1, p.y))
			};
		}
		curve = { ...curve, [activeChannel]: [...pts] };
		preview();
	}

	function onPointerUp(e: PointerEvent) {
		if (draggingIndex == null) return;
		draggingIndex = null;
		if (svgEl) svgEl.releasePointerCapture(e.pointerId);
	}

	function onDblClick(e: MouseEvent) {
		if (!svgEl) return;
		const p = toCurveSpace(e as unknown as PointerEvent);
		const pts = pointsFor(activeChannel);
		const idx = findNearestIndex(pts, p);
		if (idx > 0 && idx < pts.length - 1) {
			pts.splice(idx, 1);
			curve = { ...curve, [activeChannel]: [...pts] };
			preview();
		}
	}

	function curvePath(pts: CurvePoint[]): string {
		const samples = 128;
		let d = '';
		for (let i = 0; i <= samples; i++) {
			const t = i / samples;
			const v = evalCurve(pts, t);
			const cmd = i === 0 ? 'M' : 'L';
			d += `${cmd} ${t.toFixed(4)} ${(1 - v).toFixed(4)} `;
		}
		return d;
	}

	$effect(() => {
		saveSettings('effects.curves', curve);
	});

	onMount(() => {
		preview();
		const detachSwitcher = attachSwitcherDismiss(
			() => switcherOpen,
			() => (switcherOpen = false)
		);
		return () => {
			detachSwitcher();
			getEditorRenderer().setActiveLayerFilterPreview(null);
		};
	});
</script>

<MovableDialog title="Curves" onClose={cancel} width={420}>
	{#snippet titleLeft()}
		<span class="filter-switcher">
			<button
				class="m-menu-btn"
				title="Change adjustment"
				aria-label="Change adjustment"
				aria-expanded={switcherOpen}
				onclick={() => (switcherOpen = !switcherOpen)}
			><img src={SwitchIcon} class="m-btn-ic" alt="" draggable="false" /></button>
			{#if switcherOpen}
				<EffectBrowserMenu
					placement="down"
					ariaLabel="Replace adjustment"
					isEnabled={() => true}
					groups={[{ label: ADJUSTMENTS_MENU, effects: adjustmentDialogs }]}
					onPick={switchAdj}
				/>
			{/if}
		</span>
	{/snippet}

	{#snippet titleRight()}
		{#if prevDef && nextDef}
			<button
				class="m-menu-btn"
				title={prevDef.label}
				aria-label="Previous adjustment: {prevDef.label}"
				onclick={() => switchAdj(prevId)}
			><img src={PrevIcon} class="m-btn-ic" alt="" draggable="false" /></button>
			<button
				class="m-menu-btn"
				title={nextDef.label}
				aria-label="Next adjustment: {nextDef.label}"
				onclick={() => switchAdj(nextId)}
			><img src={NextIcon} class="m-btn-ic" alt="" draggable="false" /></button>
		{/if}
	{/snippet}

	<div class="tabs">
		{#each CHANNELS as ch}
			<button
				class="tab"
				class:active={activeChannel === ch.key}
				onclick={() => {
					activeChannel = ch.key;
					preview();
				}}
			>
				<span class="dot" style="background:{ch.color}"></span>
				{ch.label}
			</button>
		{/each}
	</div>

	<div class="editor">
		<svg
			bind:this={svgEl}
			viewBox="-0.02 -0.02 1.04 1.04"
			width="256"
			height="256"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			ondblclick={onDblClick}
		>
			<!-- Plot surface: the app's recessed well, not a slate panel. SVG
			     presentation attributes cannot take `var()`, so these are the
			     literal palette values. -->
			<rect x="0" y="0" width="1" height="1" fill="#0b0c0e" rx="0.01" />
			<!-- grid -->
			{#each [0.25, 0.5, 0.75] as g}
				<line x1={g} y1="0" x2={g} y2="1" stroke="#2b2e34" stroke-width="0.002" />
				<line x1="0" y1={g} x2="1" y2={g} stroke="#2b2e34" stroke-width="0.002" />
			{/each}
			<!-- diagonal -->
			<line x1="0" y1="1" x2="1" y2="0" stroke="#5d626c" stroke-width="0.003" />
			<!-- curve -->
			{#each CHANNELS as ch}
				{#if activeChannel === ch.key}
					<path d={curvePath(pointsFor(ch.key))} fill="none" stroke={ch.color} stroke-width="0.006" />
				{/if}
			{/each}
			<!-- points -->
			{#each pointsFor(activeChannel) as p, i}
				<circle
					cx={p.x}
					cy={1 - p.y}
					r={draggingIndex === i ? 0.012 : 0.008}
					fill={i === 0 || i === pointsFor(activeChannel).length - 1 ? '#e5e7eb' : '#ffffff'}
					stroke={CHANNELS.find((c) => c.key === activeChannel)?.color ?? '#fff'}
					stroke-width="0.003"
				/>
			{/each}
		</svg>
	</div>

	<div class="row">
		<button class="btn-reset" onclick={resetChannel}>Reset {CHANNELS.find((c) => c.key === activeChannel)?.label}</button>
	</div>

	<label class="radio">
		<input type="checkbox" bind:checked={previewOn} onchange={togglePreview} />
		Preview
	</label>

	{#snippet actions()}
		<button class="btn-secondary" onclick={cancel}>Cancel</button>
		<button class="btn-primary" onclick={apply}>Apply</button>
	{/snippet}
</MovableDialog>

<style>
	.tabs {
		display: flex;
		gap: 4px;
		margin-bottom: 8px;
	}
	/* Same plate as `.tb-btn` / `.seg-btn` so the dialog's controls match the
	   rest of the app instead of carrying their own grey ramp. */
	.tab {
		flex: 1;
		padding: 6px 0;
		background: linear-gradient(180deg, #3a3e45, #272a2f);
		color: var(--text-dim);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		font-size: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		transition: filter 100ms;
	}
	.tab:hover {
		filter: brightness(1.15);
	}
	/* Active = the shared accent pill (.seg-btn.on / .menubar-btn.open). */
	.tab.active {
		background: linear-gradient(180deg, #3f82f2, #2c6fe0 55%, #2158b8);
		color: #fff;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.28) inset,
			0 1px 3px rgba(0, 0, 0, 0.5),
			0 0 10px rgba(60, 130, 255, 0.28);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}
	.editor {
		display: flex;
		justify-content: center;
		margin-bottom: 8px;
	}
	.editor svg {
		border-radius: 6px;
		cursor: crosshair;
		user-select: none;
	}
	.row {
		display: flex;
		justify-content: center;
		margin-bottom: 8px;
	}
	.btn-reset {
		padding: 4px 10px;
		font-size: 12px;
		background: linear-gradient(180deg, #3a3e45, #272a2f);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		transition: filter 100ms;
	}
	.btn-reset:hover {
		filter: brightness(1.18);
	}
	.radio {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--text);
		margin-top: 4px;
	}
</style>
