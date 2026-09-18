<script lang="ts">
	import './FilterSlider.css';
	// Layer: components. Compact single-row slider for filter dialogs: -/+
	// step buttons around a custom drag track with the LABEL overlaid inside
	// (left) and the value (right, click-to-edit), plus an icon-only reset
	// button restoring the default. Same props/callback contract as the old
	// native-range version (`oninput` live, `onCommit` discrete) so all call
	// sites keep working.
	//
	// When a `gradient` CSS string is given it paints the track background;
	// then no fill bar is shown and a single black line marks the position.
	import { tick } from 'svelte';
	import MinusIcon from '@material-symbols/svg-400/rounded/remove.svg';
	import PlusIcon from '@material-symbols/svg-400/rounded/add.svg';
	interface Props {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		/** the value the reset button restores the slider to */
		default: number;
		/** CSS background value (gradient or colour) painted on the track */
		gradient?: string;
		/** Opt-in center tick (range middle) — explicit per effect param. */
		centerTick?: boolean;
		oninput?: () => void;
		onCommit?: () => void;
	}
	let { label, value = $bindable(), min, max, step = 1, default: dflt, gradient, centerTick = false, oninput, onCommit }: Props = $props();

	let trackEl: HTMLDivElement | undefined = $state();
	let dragging = false;
	let editing = $state(false);
	let editInput: HTMLInputElement | undefined = $state();
	/** Timestamp of the last track press — a quick second press belongs to a
	 * double-click (reset) and must not jump the value first. */
	let lastDownTime = 0;

	const range = $derived(max - min);
	const ratio = $derived(range <= 0 ? 0 : Math.max(0, Math.min(1, (value - min) / range)));
	/** Display precision follows the step (1 → 0 decimals, 0.1 → 1, …). */
	const decimals = $derived.by(() => {
		const s = String(Math.abs(step));
		if (!s.includes('.')) return 0;
		return Math.min(6, s.split('.')[1].replace(/0+$/, '').length || 0);
	});
	const displayValue = $derived(clampToRange(value).toFixed(decimals));

	/** Tick columns for small discrete ranges (at most 10 intervals, steps
	 * landing exactly on values). Gradient tracks never get ticks. */
	const tickInfo = $derived.by((): { every: number; count: number } | null => {
		if (gradient || range <= 0) return null;
		const s = Math.max(1e-6, Math.abs(step));
		const n = Math.round(range / s);
		if (n <= 0 || n > 10) return null;
		return Math.abs(n * s - range) < 1e-6 ? { every: s, count: n } : null;
	});
	const showTicks = $derived(tickInfo !== null);

	function reset(): void {
		value = dflt;
		oninput?.();
		onCommit?.();
	}

	function clampToRange(v: number): number {
		const s = Math.max(1e-6, Math.abs(step));
		return Math.max(min, Math.min(max, Math.round(v / s) * s));
	}

	function setValue(v: number, commit: boolean): void {
		value = clampToRange(v);
		oninput?.();
		if (commit) onCommit?.();
	}

	function setFromClientX(clientX: number, commit: boolean): void {
		const track = trackEl;
		if (!track || range <= 0) return;
		const r = track.getBoundingClientRect();
		setValue(min + ((clientX - r.left) / Math.max(r.width, 1)) * range, commit);
	}

	function onTrackDown(e: PointerEvent): void {
		// Clicks on the value button / edit field belong to them, not the drag.
		if ((e.target as HTMLElement | null)?.closest('button, input')) return;
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		// Second half of a double-click: skip the jump, `ondblclick` resets.
		const now = performance.now();
		const isDbl = now - lastDownTime < 350;
		lastDownTime = now;
		if (isDbl) return;
		dragging = true;
		try {
			trackEl?.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		setFromClientX(e.clientX, false);
	}
	function onTrackMove(e: PointerEvent): void {
		if (!dragging || !trackEl?.hasPointerCapture(e.pointerId)) return;
		setFromClientX(e.clientX, false);
	}
	function onTrackUp(): void {
		if (!dragging) return;
		dragging = false;
		onCommit?.();
	}

	function stepBy(factor: number): void {
		const s = Math.max(1e-6, Math.abs(step));
		setValue(value + factor * s, true);
	}

	/** Step buttons: left click = 1 step, right click = 10 steps. */
	function onStepDown(dir: -1 | 1, e: MouseEvent): void {
		e.preventDefault();
		stepBy((e.button === 2 ? 10 : 1) * dir);
	}

	function onTrackKey(e: KeyboardEvent): void {
		const s = Math.max(1e-6, Math.abs(step));
		let handled = true;
		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowDown':
				setValue(value - s, true);
				break;
			case 'ArrowRight':
			case 'ArrowUp':
				setValue(value + s, true);
				break;
			case 'PageDown':
				setValue(value - 10 * s, true);
				break;
			case 'PageUp':
				setValue(value + 10 * s, true);
				break;
			case 'Home':
				setValue(min, true);
				break;
			case 'End':
				setValue(max, true);
				break;
			default:
				handled = false;
		}
		if (handled) e.preventDefault();
	}

	async function startEdit(): Promise<void> {
		editing = true;
		await tick();
		if (editInput) {
			editInput.value = displayValue;
			editInput.focus();
			editInput.select();
		}
	}

	function commitEdit(): void {
		if (!editing) return;
		editing = false;
		const n = parseFloat(editInput?.value ?? '');
		if (Number.isFinite(n)) setValue(n, true);
	}

	function cancelEdit(): void {
		editing = false;
	}
</script>

<div class="fsl">
	<button
		type="button"
		class="fsl-step"
		title="Decrease (right-click: −10 steps)"
		aria-label="Decrease {label}"
		onmousedown={(e) => onStepDown(-1, e)}
		oncontextmenu={(e) => e.preventDefault()}
	><img src={MinusIcon} class="fsl-step-ic" alt="" draggable="false" /></button>
	<div
		bind:this={trackEl}
		class="fsl-track"
		class:dragging
		class:has-grad={!!gradient}
		style={gradient ? `background:${gradient}` : undefined}
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuenow={clampToRange(value)}
		aria-valuetext={displayValue}
		title="{label} — drag or click to set, double-click to reset"
		onpointerdown={onTrackDown}
		onpointermove={onTrackMove}
		onpointerup={onTrackUp}
		onpointercancel={onTrackUp}
		ondblclick={(e) => {
			// Double-clicks on the value/edit controls keep their own
			// behaviour (e.g. word-select) and must not reset.
			if ((e.target as HTMLElement | null)?.closest('button, input')) return;
			reset();
		}}
		onkeydown={onTrackKey}
		oncontextmenu={(e) => e.preventDefault()}
	>
		{#if showTicks && tickInfo}
			<div class="fsl-ticks" style="--tick:{(tickInfo.every / range) * 100}%;"></div>
		{/if}
		<div class="fsl-fill" style="width:{ratio * 100}%;"></div>
		{#if showTicks && tickInfo && !gradient}
			<div
				class="fsl-ticks-over"
				style="--tick:{(tickInfo.every / range) * 100}%; clip-path: inset(0 {(1 - ratio) * 100}% 0 0);"
			></div>
		{/if}
		{#if centerTick}
			<div class="fsl-tick-center"></div>
		{/if}
		{#if gradient}
			<div class="fsl-pos" style="left:{ratio * 100}%;"></div>
		{/if}
		<div class="fsl-overlay">
			<span class="fsl-overlay-label"><span class="fsl-label-frame">{label}</span></span>
			{#if editing}
				<input
					bind:this={editInput}
					class="fsl-edit"
					type="text"
					inputmode="decimal"
					autocomplete="off"
					spellcheck={false}
					aria-label="{label} value"
					onblur={commitEdit}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							commitEdit();
							editInput?.blur();
						} else if (e.key === 'Escape') {
							e.stopPropagation();
							e.preventDefault();
							cancelEdit();
						}
					}}
				/>
			{:else}
				<button
					type="button"
					class="fsl-value"
					title="Right-click to edit value"
					oncontextmenu={(e) => {
						e.preventDefault();
						void startEdit();
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							void startEdit();
						}
					}}
				>
					{displayValue}
				</button>
			{/if}
		</div>
	</div>
	<button
		type="button"
		class="fsl-step"
		title="Increase (right-click: +10 steps)"
		aria-label="Increase {label}"
		onmousedown={(e) => onStepDown(1, e)}
		oncontextmenu={(e) => e.preventDefault()}
	><img src={PlusIcon} class="fsl-step-ic" alt="" draggable="false" /></button>
	<button
		class="fsl-reset"
		type="button"
		title="Reset to default"
		aria-label="Reset to default"
		disabled={value === dflt}
		onclick={reset}
	>↺</button>
</div>
