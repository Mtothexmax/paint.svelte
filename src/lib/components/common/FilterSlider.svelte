<script lang="ts">
	import './FilterSlider.css';
	// Layer: components. Compact single-row slider for filter dialogs: -/+
	// step buttons around a custom drag track with the LABEL overlaid inside
	// (left) and an always-editable value field (right), plus an icon-only
	// reset button restoring the default. Same props/callback contract
	// throughout (`oninput` live, `onCommit` discrete) so all call sites
	// (filter popups, toolbar, panels) keep working.
	//
	// Look: sunken well, glowing fill, knurled thumb that overhangs the track
	// ends at min/max, pill labels. The value field is always an input;
	// double-click or right-click focuses + selects it for typing (a single
	// click does nothing); typing applies live.
	//
	// When a `gradient` CSS string is given it paints the track background;
	// then no fill bar is shown and a single black line marks the position.
	import MinusIcon from '@material-symbols/svg-400/rounded/remove.svg';
	import PlusIcon from '@material-symbols/svg-400/rounded/add.svg';
	interface Props {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		/** the value the reset button restores the slider to; when omitted
		 * (e.g. toolbar sliders) no reset button is shown and double-click
		 * does nothing */
		default?: number;
		/** display suffix for the value (e.g. "%") — never parsed on edit */
		unit?: string;
		/** CSS background value (gradient or colour) painted on the track */
		gradient?: string;
		/** Opt-in center marker (range middle) — explicit per effect param.
		 * Rendered as a small dot at the track centre, not a line. */
		centerTick?: boolean;
		/** Fill the available width (e.g. layers-panel opacity row) instead
		 * of sizing to content. */
		grow?: boolean;
		oninput?: () => void;
		onCommit?: () => void;
		/** Fires when a real drag starts (first move) and ends — e.g. for a
		 * live preview popup. Plain clicks never fire it. */
		ondragchange?: (dragging: boolean) => void;
	}
	let { label, value = $bindable(), min, max, step = 1, default: dflt, unit = '', gradient, centerTick = false, grow = false, oninput, onCommit, ondragchange }: Props = $props();

	let trackEl: HTMLDivElement | undefined = $state();
	let dragging = false;
	let dragNotified = false;
	let valInput: HTMLInputElement | undefined = $state();
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
	/** Input width in ch so the field hugs its content. */
	const editCh = $derived.by(() => {
		const ints = String(Math.floor(Math.abs(max))).length;
		return ints + (decimals > 0 ? decimals + 1 : 0) + (min < 0 ? 1 : 0) + 1;
	});

	/** Tick columns: small discrete ranges get one tick per step (at most 10
	 * intervals, steps landing exactly on values). Gradient tracks never get
	 * column ticks — only the property-driven center tick. */
	const tickInfo = $derived.by((): { every: number; count: number } | null => {
		if (gradient || range <= 0) return null;
		const s = Math.max(1e-6, Math.abs(step));
		const n = Math.round(range / s);
		if (n <= 0 || n > 10) return null;
		return Math.abs(n * s - range) < 1e-6 ? { every: s, count: n } : null;
	});
	const showTicks = $derived(tickInfo !== null);

	// Mirror the live value into the field unless the user is typing in it.
	$effect(() => {
		const text = displayValue;
		const el = valInput;
		if (el && document.activeElement !== el) el.value = text;
	});

	function reset(): void {
		if (dflt === undefined) return;
		value = dflt;
		// A focused field would otherwise keep showing the stale text.
		if (valInput && document.activeElement === valInput) valInput.value = displayValue;
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

	function setFromClientX(clientX: number, commit: boolean, fine: boolean): void {
		const track = trackEl;
		if (!track || range <= 0) return;
		const r = track.getBoundingClientRect();
		let pct = ((clientX - r.left) / Math.max(r.width, 1)) * 100;
		if (!fine) {
			// Snap to quarter stops unless Alt is held (fine adjust).
			for (const stop of [0, 25, 50, 75, 100]) {
				if (Math.abs(pct - stop) < 1.3) {
					pct = stop;
					break;
				}
			}
		}
		setValue(min + (pct / 100) * range, commit);
	}

	function onTrackDown(e: PointerEvent): void {
		// No interactive children to exclude: presses anywhere — including on
		// the number field (which blocks only its own focus, see below) —
		// start a full drag, exactly like any other track position.
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
		setFromClientX(e.clientX, false, e.altKey);
	}
	function onTrackMove(e: PointerEvent): void {
		if (!dragging || !trackEl?.hasPointerCapture(e.pointerId)) return;
		setFromClientX(e.clientX, false, e.altKey);
		if (!dragNotified) {
			dragNotified = true;
			ondragchange?.(true);
		}
	}
	function onTrackUp(): void {
		if (!dragging) return;
		dragging = false;
		if (dragNotified) {
			dragNotified = false;
			ondragchange?.(false);
		}
		onCommit?.();
	}

	function stepBy(factor: number): void {
		const s = Math.max(1e-6, Math.abs(step));
		setValue(value + factor * s, true);
	}

	/** Step buttons: left click = 1 step, right click = 10 steps. Holding
	 * repeats after 380 ms every 45 ms (like the reference design). */
	let pushDir: -1 | 0 | 1 = $state(0);
	let stepTimer: ReturnType<typeof setTimeout> | undefined;
	let stepRepeat: ReturnType<typeof setInterval> | undefined;
	function stopStep(): void {
		pushDir = 0;
		if (stepTimer !== undefined) {
			clearTimeout(stepTimer);
			stepTimer = undefined;
		}
		if (stepRepeat !== undefined) {
			clearInterval(stepRepeat);
			stepRepeat = undefined;
		}
	}
	function startStep(dir: -1 | 1, e: MouseEvent): void {
		e.preventDefault();
		stopStep();
		const size = (e.button === 2 ? 10 : 1) * dir;
		pushDir = dir;
		stepBy(size);
		stepTimer = setTimeout(() => {
			stepRepeat = setInterval(() => stepBy(size), 45);
		}, 380);
	}

	function onTrackKey(e: KeyboardEvent): void {
		const s = Math.max(1e-6, Math.abs(step));
		const big = e.shiftKey ? 10 * s : s;
		let handled = true;
		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowDown':
				setValue(value - big, true);
				break;
			case 'ArrowRight':
			case 'ArrowUp':
				setValue(value + big, true);
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

	function focusValue(): void {
		valInput?.focus();
		valInput?.select();
	}

	function onValueInput(e: Event): void {
		const el = e.currentTarget as HTMLInputElement;
		const cleaned = el.value.replace(/[^0-9.\-]/g, '');
		if (cleaned !== el.value) el.value = cleaned;
		if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return;
		const n = parseFloat(cleaned);
		if (Number.isFinite(n)) setValue(n, false);
	}

	function onValueKey(e: KeyboardEvent): void {
		const el = e.currentTarget as HTMLInputElement;
		if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
			e.preventDefault();
			const s = Math.max(1e-6, Math.abs(step)) * (e.shiftKey ? 10 : 1);
			setValue(value + (e.key === 'ArrowUp' ? s : -s), true);
			el.value = displayValue;
		} else if (e.key === 'Enter' || e.key === 'Escape') {
			if (e.key === 'Escape') e.stopPropagation();
			el.blur();
		}
	}

	function onValueBlur(): void {
		if (valInput) valInput.value = displayValue;
		onCommit?.();
	}
</script>

<svelte:window onpointerup={stopStep} onblur={stopStep} />

<div class="fsl" class:grow={grow}>
	<button
		type="button"
		class="fsl-step"
		class:push={pushDir === -1}
		title="Decrease (right-click: −10 steps)"
		aria-label="Decrease {label}"
		onmousedown={(e) => startStep(-1, e)}
		onmouseup={stopStep}
		onmouseleave={stopStep}
		oncontextmenu={(e) => e.preventDefault()}
	><img src={MinusIcon} class="fsl-step-ic" alt="" draggable="false" /></button>
	<div
		bind:this={trackEl}
		class="fsl-track"
		class:dragging
		class:has-grad={!!gradient}
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuenow={clampToRange(value)}
		aria-valuetext="{displayValue}{unit}"
		title="{label} — drag to set (Alt: fine adjust), double-click to reset"
		onpointerdown={onTrackDown}
		onpointermove={onTrackMove}
		onpointerup={onTrackUp}
		onpointercancel={onTrackUp}
		onwheel={(e) => {
			e.preventDefault();
			const s = Math.max(1e-6, Math.abs(step));
			setValue(value + (e.deltaY < 0 ? s : -s), true);
		}}
		onkeydown={onTrackKey}
		oncontextmenu={(e) => e.preventDefault()}
		ondblclick={(e) => {
			// Double-clicks in the value box keep field behaviour (word
			// select) and must not reset.
			if ((e.target as HTMLElement | null)?.closest('.fsl-valuebox')) return;
			if (dflt === undefined) return;
			reset();
		}}
	>
		<div class="fsl-well" style={gradient ? `background:${gradient}` : undefined}>
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
			{:else}
				<div
					class="fsl-edge"
					style="left: calc({ratio * 100}% - 0.75px); {ratio <= 0 || ratio >= 1 ? 'opacity: 0;' : ''}"
				></div>
			{/if}
			<div class="fsl-glass"></div>
		</div>
		<div class="fsl-thumb" style="left: calc({ratio * 100}% - 5.5px);"></div>
		<div class="fsl-overlay">
			<span class="fsl-overlay-label"><span class="fsl-label-frame">{label}</span></span>
			<span
				class="fsl-valuebox"
				role="button"
				tabindex="0"
				aria-label="{label} value — activate to type a value"
				title="Double-click or right-click to type a value"
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						focusValue();
					}
				}}
				oncontextmenu={(e) => {
					e.preventDefault();
					focusValue();
				}}
				ondblclick={focusValue}
			>
				<input
					bind:this={valInput}
					class="fsl-input"
					type="text"
					inputmode="decimal"
					autocomplete="off"
					spellcheck={false}
					aria-label="{label} value"
					style="width:{editCh}ch;"
					onmousedown={(e) => {
						// Left press must not focus the field (no caret) — the
						// pill handler above jumps like the track instead.
						// Right button untouched so contextmenu editing works.
						if (e.button === 0) e.preventDefault();
					}}
					oninput={onValueInput}
					onkeydown={onValueKey}
					onblur={onValueBlur}
				/>
				{#if unit}<span class="fsl-unit">{unit}</span>{/if}
			</span>
		</div>
	</div>
	<button
		type="button"
		class="fsl-step"
		class:push={pushDir === 1}
		title="Increase (right-click: +10 steps)"
		aria-label="Increase {label}"
		onmousedown={(e) => startStep(1, e)}
		onmouseup={stopStep}
		onmouseleave={stopStep}
		oncontextmenu={(e) => e.preventDefault()}
	><img src={PlusIcon} class="fsl-step-ic" alt="" draggable="false" /></button>
	{#if dflt !== undefined}
		<button
			class="fsl-reset"
			type="button"
			title="Reset to default"
			aria-label="Reset to default"
			disabled={value === dflt}
			onclick={reset}
		>↺</button>
	{/if}
</div>
