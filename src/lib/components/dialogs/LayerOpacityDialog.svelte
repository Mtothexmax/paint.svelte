<script lang="ts">
	// Layer: components. "Layer opacity" panel (Claude-design inspired):
	// chrome-panel shell with title+subtitle+grip titlebar, 148px composite
	// preview, slider row (– · track · +) with value box, blend-mode well,
	// all wired to the active layer's `opacity` and `blendMode`.
	//
	// No Apply/Cancel: every change auto-commits to history as a single
	// undoable entry per gesture (one drag = one undo step).
	import { onMount } from 'svelte';
	import { documentRegistry } from '../../core/document/registry';
	import {
		setLayerOpacityLive,
		commitLayerOpacity,
		setLayerBlendMode
	} from '../../services/layersService';
	import { isLayerBlendMode, type LayerBlendMode } from '../../core/layers/Layer';
	import CloseIcon from '@material-symbols/svg-400/rounded/close.svg';
	import { closeDialog } from '../../services/dialogService';

	const doc = documentRegistry.active;
	const layer = doc?.activeLayer;
	const layerId = layer?.id ?? '';
	const startOpacity = layer ? Math.round(layer.opacity * 100) : 100;
	const startBlend: LayerBlendMode = layer
		? isLayerBlendMode(layer.blendMode)
			? layer.blendMode
			: 'normal'
		: 'normal';

	let value = $state(startOpacity);
	let blendMode = $state<LayerBlendMode>(startBlend);
	let dragging = false;
	let dragValue = startOpacity;
	let pendingOriginal: number | null = null;
	let track: HTMLDivElement | undefined = $state();

	// Position + drag — small reusable save-in-memory across remounts.
	let pos = $state({ x: 0, y: 0 });
	let dragOff = { x: 0, y: 0 };
	let isDragging = false;
	let posInited = false;

	// Blend modes shown in the well — the four most commonly used from the
	// Paint.NET strip. The full set is still reachable via Layers panel.
	const MODES = [
		{ id: 'normal', label: 'Normal' },
		{ id: 'multiply', label: 'Multiply' },
		{ id: 'screen', label: 'Screen' },
		{ id: 'overlay', label: 'Overlay' }
	] as const;

	const pct = $derived(value);

	function close() {
		closeDialog();
	}

	function commit(v: number): number {
		return Math.max(0, Math.min(100, Math.round(v)));
	}

	function clampTrack(clientX: number): number {
		if (!track) return value;
		const r = track.getBoundingClientRect();
		return commit(((clientX - r.left) / Math.max(1, r.width)) * 100);
	}

	function setOpacity(v: number) {
		const next = commit(v);
		value = next;
		if (dragging) dragValue = next;
		if (layerId) setLayerOpacityLive(layerId, next / 100);
	}

	function nudge(dir: number, big = false) {
		const next = commit(value + dir * (big ? 10 : 1));
		if (next === value || !layerId) return;
		if (pendingOriginal === null) pendingOriginal = startOpacity;
		setOpacity(next);
		commitLayerOpacity(layerId, pendingOriginal, next);
		pendingOriginal = next;
	}

	function startDrag(e: PointerEvent) {
		const target = e.target as HTMLElement | null;
		if (target?.closest('input, button')) return;
		if (e.button !== undefined && e.button !== 0) return;
		e.preventDefault();
		dragging = true;
		dragValue = value;
		if (pendingOriginal === null) pendingOriginal = value;
		try {
			track?.setPointerCapture?.(e.pointerId);
		} catch {
			/* ignore */
		}
		setOpacity(clampTrack(e.clientX));
	}

	function moveDrag(e: PointerEvent) {
		if (!dragging) return;
		if (!track?.hasPointerCapture(e.pointerId)) return;
		e.preventDefault();
		setOpacity(clampTrack(e.clientX));
	}

	function endDrag() {
		if (!dragging) return;
		dragging = false;
		if (layerId && pendingOriginal !== null && dragValue !== pendingOriginal) {
			commitLayerOpacity(layerId, pendingOriginal, dragValue);
		}
		pendingOriginal = null;
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		nudge(e.deltaY < 0 ? 1 : -1, e.shiftKey);
	}

	function onKey(e: KeyboardEvent) {
		const big = e.shiftKey;
		if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			e.preventDefault();
			nudge(1, big);
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			e.preventDefault();
			nudge(-1, big);
		} else if (e.key === 'Home') {
			e.preventDefault();
			setOpacity(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			setOpacity(100);
		}
	}

	function onInput() {
		const n = parseInt(valueBoxEl?.value ?? '', 10);
		if (!Number.isFinite(n)) return;
		const next = commit(n);
		if (next === value || !layerId) return;
		if (pendingOriginal === null) pendingOriginal = value;
		setOpacity(next);
		commitLayerOpacity(layerId, pendingOriginal, next);
		pendingOriginal = next;
	}

	function onInputKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			(e.currentTarget as HTMLInputElement).blur();
		}
	}

	function setMode(id: LayerBlendMode) {
		if (id === blendMode || !layerId) return;
		blendMode = id;
		setLayerBlendMode(layerId, id);
	}

	function onPointerDownStep(e: PointerEvent, dir: number) {
		if (e.button === 2) {
			e.preventDefault();
			nudge(dir, true);
		}
	}

	// Title-bar drag.
	function beginTitleDrag(e: PointerEvent) {
		if ((e.target as HTMLElement | null)?.closest('button, input')) return;
		isDragging = true;
		dragOff = { x: e.clientX - pos.x, y: e.clientY - pos.y };
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
	}
	function moveTitleDrag(e: PointerEvent) {
		if (!isDragging) return;
		pos.x = Math.max(0, e.clientX - dragOff.x);
		pos.y = Math.max(0, e.clientY - dragOff.y);
	}
	function endTitleDrag() {
		isDragging = false;
	}

	let valueBoxEl: HTMLInputElement | undefined = $state();
	let panel: HTMLDivElement | undefined = $state();

	onMount(() => {
		// Center the dialog on first mount.
		if (!posInited && typeof window !== 'undefined') {
			pos = {
				x: Math.max(0, Math.round((window.innerWidth - 392) / 2)),
				y: Math.max(24, Math.round((window.innerHeight - 460) / 2))
			};
			posInited = true;
		}
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	$effect(() => {
		if (valueBoxEl && document.activeElement !== valueBoxEl) {
			valueBoxEl.value = String(value);
		}
	});
</script>

<div
	bind:this={panel}
	class="lo-panel"
	role="dialog"
	aria-label="Layer opacity"
	style="left: {pos.x}px; top: {pos.y}px;"
	oncontextmenu={(e) => e.preventDefault()}
>
	<div
		class="lo-titlebar"
		onpointerdown={beginTitleDrag}
		onpointermove={moveTitleDrag}
		onpointerup={endTitleDrag}
		onpointercancel={endTitleDrag}
	>
		<h1 class="lo-title">Layer opacity</h1>
		<span class="lo-subtitle">Ebenendeckkraft</span>
		<span class="lo-grip" aria-hidden="true"></span>
		<button class="lo-close" title="Close" aria-label="Close" onclick={close}>
			<img src={CloseIcon} alt="" draggable="false" />
		</button>
	</div>

	<div class="lo-body">
		<div class="lo-preview">
			<svg
				class="lo-sky"
				viewBox="0 0 360 150"
				preserveAspectRatio="xMidYMid slice"
				aria-hidden="true"
			>
				<defs>
					<linearGradient id="lo-sky" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stop-color="#2d3a52" />
						<stop offset="1" stop-color="#6d5a63" />
					</linearGradient>
					<linearGradient id="lo-wash" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0" stop-color="#ff5d8f" />
						<stop offset="0.55" stop-color="#8b5cf6" />
						<stop offset="1" stop-color="#22d3ee" />
					</linearGradient>
				</defs>
				<rect width="360" height="150" fill="url(#lo-sky)" />
				<circle cx="286" cy="44" r="17" fill="#f0c98a" opacity="0.9" />
				<path
					d="M0 112 L74 66 L128 104 L186 60 L252 112 L360 74 L360 150 L0 150Z"
					fill="#26303f"
				/>
				<path
					d="M0 132 L96 96 L168 128 L246 98 L360 134 L360 150 L0 150Z"
					fill="#171d27"
				/>
				<g class="lo-layer" style="opacity: {value / 100}">
					<rect width="360" height="150" fill="url(#lo-wash)" />
					<g fill="none" stroke="#0b0c10" stroke-opacity="0.5">
						<circle cx="96" cy="62" r="46" stroke-width="10" />
						<circle cx="232" cy="96" r="62" stroke-width="10" />
					</g>
					<rect x="140" y="20" width="86" height="86" fill="#0b0c10" opacity="0.22" />
				</g>
				<div class="lo-vignette"></div>
			</svg>
		</div>

		<div class="lo-row">
			<button
				class="lo-step"
				title="-1 / right-click -10"
				aria-label="Decrease opacity"
				onclick={() => nudge(-1)}
				onpointerdown={(e) => onPointerDownStep(e, -1)}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
					><path d="M5 12h14" /></svg
				>
			</button>

			<div class="lo-track-wrap" class:live={dragging}>
				<div
					bind:this={track}
					class="lo-track"
					role="slider"
					tabindex="0"
					aria-label="Layer opacity"
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuenow={value}
					aria-valuetext="{value} percent"
					onpointerdown={startDrag}
					onpointermove={moveDrag}
					onpointerup={endDrag}
					onpointercancel={endDrag}
					onwheel={onWheel}
					onkeydown={onKey}
				>
					<div class="lo-fill" style="width: {pct}%"></div>
					<div
						class="lo-edge"
						style="left: {pct}%; opacity: {value === 0 || value === 100 ? 0 : 1}"
					></div>
					<div class="lo-ruling"></div>
					<div class="lo-glass"></div>
					<div class="lo-overlay">
						<span class="lo-tag">Opacity</span>
						<span class="lo-valuebox">
							<input
								bind:this={valueBoxEl}
								type="text"
								inputmode="numeric"
								maxlength="3"
								aria-label="Opacity percent"
								value={value}
								oninput={onInput}
								onkeydown={onInputKey}
							/>
							<span class="lo-pct">%</span>
						</span>
					</div>
				</div>
				<div class="lo-thumb" style="left: calc({pct}% - 5.5px)"></div>
			</div>

			<button
				class="lo-step"
				title="+1 / right-click +10"
				aria-label="Increase opacity"
				onclick={() => nudge(+1)}
				onpointerdown={(e) => onPointerDownStep(e, +1)}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"
					><path d="M12 5v14M5 12h14" /></svg
				>
			</button>
		</div>

		<p class="lo-hint">
			Drag the groove &middot; buttons step 1, right-click 10 &middot; arrows ±1, Shift ±10
		</p>

		<div class="lo-mode-well" role="group" aria-label="Blend mode">
			{#each MODES as m (m.id)}
				<button
					type="button"
					class="lo-mode"
					aria-pressed={blendMode === m.id}
					onclick={() => setMode(m.id)}
				>
					{m.label}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	/* ---- chrome-panel shell ---- */
	.lo-panel {
		position: fixed;
		width: 392px;
		border-radius: 10px;
		border: 1px solid rgba(0, 0, 0, 0.6);
		background: linear-gradient(180deg, #2b2e34, #1a1c20 70%, #16181b);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.13) inset,
			0 -1px 0 rgba(0, 0, 0, 0.5) inset,
			0 24px 48px -16px rgba(0, 0, 0, 0.7),
			0 4px 12px rgba(0, 0, 0, 0.4);
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
		-webkit-font-smoothing: antialiased;
		color: #e7e9ee;
		z-index: 1000;
		user-select: none;
	}
	.lo-panel::after {
		/* Tiny grain layer — texture for the chrome (Claude reference). The
		   SVG fractal-noise filter is inlined as a data URI to avoid any
		   network dependency. */
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.22;
		border-radius: inherit;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
		mix-blend-mode: overlay;
	}

	/* ---- titlebar ---- */
	.lo-titlebar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 9px 12px;
		border-bottom: 1px solid rgba(0, 0, 0, 0.55);
		box-shadow: 0 1px 0 rgba(255, 255, 255, 0.075) inset;
		background: linear-gradient(180deg, #34383f, #22252a);
		border-radius: 10px 10px 0 0;
		cursor: grab;
	}
	.lo-titlebar:active {
		cursor: grabbing;
	}
	.lo-title {
		font-size: 12.5px;
		font-weight: 600;
		margin: 0;
		letter-spacing: 0.02em;
		color: #e7e9ee;
	}
	.lo-subtitle {
		font-size: 11px;
		color: #5d626c;
	}
	.lo-grip {
		margin-left: auto;
		width: 22px;
		height: 14px;
		border-radius: 3px;
		opacity: 0.6;
		background: repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0 1px, transparent 1px 4px);
	}
	.lo-close {
		margin-left: 6px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: 0;
		border-radius: 5px;
		background: transparent;
		color: #e7e9ee;
		cursor: pointer;
	}
	.lo-close:hover {
		background: rgba(255, 255, 255, 0.08);
	}
	.lo-close img {
		width: 14px;
		height: 14px;
		filter: invert(0.88);
	}

	.lo-body {
		padding: 13px 14px 14px;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* ---- preview surface ---- */
	.lo-preview {
		position: relative;
		height: 148px;
		border-radius: 7px;
		overflow: hidden;
		background-color: #15171a;
		background-image:
			linear-gradient(45deg, #232629 25%, transparent 25%),
			linear-gradient(-45deg, #232629 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, #232629 75%),
			linear-gradient(-45deg, transparent 75%, #232629 75%);
		background-size: 14px 14px;
		background-position:
			0 0,
			0 7px,
			7px -7px,
			-7px 0;
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.7),
			0 2px 10px rgba(0, 0, 0, 0.45) inset;
	}
	.lo-sky {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.lo-layer {
		transition: opacity 60ms linear;
	}
	.lo-vignette {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(130% 100% at 50% 0%, transparent 55%, rgba(0, 0, 0, 0.45));
	}

	/* ---- slider row ---- */
	.lo-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
	}
	.lo-step {
		flex: 0 0 20px;
		width: 20px;
		height: 20px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.65);
		background: linear-gradient(180deg, #3a3e45, #272a2f);
		color: #e7e9ee;
		cursor: pointer;
		padding: 0;
		transition:
			filter 100ms ease-out,
			transform 100ms ease-out;
	}
	.lo-step svg {
		width: 8px;
		height: 8px;
	}
	.lo-step:hover {
		filter: brightness(1.18);
	}
	.lo-step:active {
		transform: translateY(1px);
		background: linear-gradient(180deg, #202327, #2b2f35);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6) inset;
	}

	.lo-track-wrap {
		position: relative;
		flex: 1 1 auto;
		height: 34px;
	}
	.lo-track {
		position: absolute;
		inset: 0;
		border-radius: 7px;
		background: linear-gradient(180deg, #0b0c0e, #131519);
		box-shadow:
			0 3px 7px rgba(0, 0, 0, 0.85) inset,
			0 -1px 0 rgba(255, 255, 255, 0.075),
			0 0 0 1px rgba(0, 0, 0, 0.8);
		cursor: ew-resize;
		touch-action: none;
		overflow: hidden;
		outline: none;
	}
	.lo-track-wrap.live .lo-track,
	.lo-track:focus-visible {
		box-shadow:
			0 3px 7px rgba(0, 0, 0, 0.85) inset,
			0 -1px 0 rgba(255, 255, 255, 0.075),
			0 0 0 1px rgba(0, 0, 0, 0.85),
			0 0 0 2px #6fd4ff;
	}
	.lo-fill {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		background: #2c6fe0;
		box-shadow: 0 0 12px rgba(60, 130, 255, 0.35);
		pointer-events: none;
	}
	.lo-fill::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 46%;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.26), transparent);
	}
	.lo-edge {
		position: absolute;
		top: 2px;
		bottom: 2px;
		width: 1.5px;
		background: linear-gradient(180deg, transparent, rgba(223, 240, 255, 0.95), transparent);
		pointer-events: none;
		transform: translateX(-0.75px);
	}
	.lo-ruling {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.13) 0 1px, transparent 1px 10%);
		mix-blend-mode: overlay;
	}
	.lo-glass {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 45%, rgba(0, 0, 0, 0.32));
	}
	.lo-thumb {
		position: absolute;
		top: 2px;
		bottom: 2px;
		width: 11px;
		border-radius: 2px;
		background: linear-gradient(180deg, #f2f4f7, #b9bfc8 48%, #8e949d);
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.8),
			0 2px 5px rgba(0, 0, 0, 0.6),
			0 1px 0 rgba(255, 255, 255, 0.85) inset;
		pointer-events: none;
		transition: transform 75ms ease-out;
		z-index: 1;
	}
	.lo-thumb::before {
		content: '';
		position: absolute;
		inset: 3px;
		background: repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.42) 0 1px, transparent 1px 3px);
		border-radius: 1px;
	}
	.lo-track-wrap.live .lo-thumb {
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.85),
			0 3px 9px rgba(0, 0, 0, 0.7),
			0 0 12px rgba(60, 130, 255, 0.35),
			0 1px 0 rgba(255, 255, 255, 0.9) inset;
	}

	.lo-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 7px;
		pointer-events: none;
		z-index: 3;
	}
	.lo-tag {
		font-size: 11.5px;
		font-weight: 500;
		color: #eef1f6;
		padding: 2px 6px;
		border-radius: 3px;
		background: rgba(0, 0, 0, 0.4);
	}
	.lo-valuebox {
		display: inline-flex;
		align-items: baseline;
		gap: 1px;
		padding: 2px 5px;
		border-radius: 3px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid transparent;
		pointer-events: auto;
		cursor: text;
		font-variant-numeric: tabular-nums;
	}
	.lo-valuebox:hover {
		border-color: rgba(255, 255, 255, 0.2);
	}
	.lo-valuebox:focus-within {
		border-color: #6fd4ff;
		background: rgba(0, 0, 0, 0.7);
	}
	.lo-valuebox input {
		width: 3.1ch;
		border: 0;
		padding: 0;
		margin: 0;
		background: transparent;
		text-align: right;
		font-size: 12.5px;
		font-weight: 600;
		color: #fff;
		font-variant-numeric: tabular-nums;
		outline: none;
		cursor: text;
	}
	.lo-valuebox input:focus {
		color: #6fd4ff;
	}
	.lo-pct {
		font-size: 10.5px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.6);
	}

	.lo-hint {
		margin: 8px 0 0;
		text-align: center;
		font-size: 10.5px;
		color: #5d626c;
	}

	/* ---- blend-mode well ---- */
	.lo-mode-well {
		display: flex;
		gap: 2px;
		padding: 2px;
		border-radius: 7px;
		background: #0d0f11;
		box-shadow:
			0 2px 5px rgba(0, 0, 0, 0.7) inset,
			0 0 0 1px rgba(0, 0, 0, 0.8);
		margin-top: 12px;
	}
	.lo-mode {
		flex: 1 1 0;
		padding: 6px 4px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: #8d929c;
		font-size: 11.5px;
		font-weight: 500;
		cursor: pointer;
		transition: color 100ms ease;
		font-family: inherit;
	}
	.lo-mode:hover {
		color: #e7e9ee;
	}
	.lo-mode[aria-pressed='true'] {
		background: linear-gradient(180deg, #3d434c, #2c3138);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.13) inset,
			0 1px 3px rgba(0, 0, 0, 0.5);
		color: #fff;
	}
</style>
