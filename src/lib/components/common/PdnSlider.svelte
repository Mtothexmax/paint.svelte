<script lang="ts">
	// Paint.NET-style slider: label + ":", then [−] track-with-inner-value [+].
	// The inner number is rendered twice: light text underneath, dark text on top
	// clipped to the fill area — so the part "covered" by the bar flips colour.
	interface Props {
		label: string;
		value: number;
		min?: number;
		max?: number;
		step?: number;
		unit?: string;
		/** fit the available width: the track shrinks/stretches (e.g. in the
		 * narrow layers sidebar) without affecting non-fit usages. */
		fit?: boolean;
		onchange?: () => void;
		/** fired when the user finishes a drag / presses − or + (for single
		 * history entries in dialogs/panels). */
		onCommit?: () => void;
	}
	let { label, value = $bindable(), min = 1, max = 100, step = 1, unit = '', fit = false, onchange, onCommit }: Props = $props();

	let track: HTMLDivElement;

	const pct = $derived(((value - min) / Math.max(1, max - min)) * 100);
	const display = $derived(`${value}${unit}`);

	function clampAndRound(v: number) {
		const s = Math.max(1, Math.abs(step));
		value = Math.max(min, Math.min(max, Math.round(v / s) * s));
	}
	function commitFromX(clientX: number) {
		const r = track.getBoundingClientRect();
		const t = Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
		clampAndRound(min + t * (max - min));
		onchange?.();
	}
	function onDown(e: PointerEvent) {
		e.preventDefault();
		try {
			track.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		commitFromX(e.clientX);
	}
	function onMove(e: PointerEvent) {
		if (!track.hasPointerCapture(e.pointerId)) return;
		commitFromX(e.clientX);
	}
	function onUp() {
		onCommit?.();
	}
	function nudge(dir: number) {
		clampAndRound(value + dir * step);
		onchange?.();
		onCommit?.();
	}
	function onWheel(e: WheelEvent) {
		e.preventDefault();
		clampAndRound(value + (e.deltaY < 0 ? step : -step));
		onchange?.();
		onCommit?.();
	}
</script>

<div class="pdn-slider" class:fit={fit}>
	<span class="pdn-label">{label}:</span>
	<button class="pdn-btn" title="Decrease" onclick={() => nudge(-1)}>−</button>
	<div
		bind:this={track}
		class="pdn-track"
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuenow={value}
		onpointerdown={onDown}
		onpointermove={onMove}
		onpointerup={onUp}
		onpointercancel={onUp}
		onwheel={onWheel}
	>
		<div class="pdn-fill" style="width:{pct}%;"></div>
		<span class="pdn-text">{display}</span>
		<span class="pdn-text pdn-text-dark" style="clip-path: inset(0 {100 - pct}% 0 0);">{display}</span>
	</div>
	<button class="pdn-btn" title="Increase" onclick={() => nudge(1)}>+</button>
</div>
