<script lang="ts">
	import './AnglePicker.css';
	// Layer: components. Reusable angle picker (dial): a circle with a draggable
	// handle on its edge plus a reset button and a live degree read-out.
	// Bindable `value` is the angle in degrees. 0° points UP and angles increase
	// CLOCKWISE (compass style); range defaults to 0..360 (full circle, wraps).
	interface Props {
		value: number;
		min?: number;
		max?: number;
		step?: number;
		/** the value the reset button restores */
		default: number;
		label?: string;
		oninput?: () => void;
		onCommit?: () => void;
	}
	let {
		value = $bindable(),
		min = 0,
		max = 360,
		step = 1,
		default: dflt,
		label,
		oninput,
		onCommit
	}: Props = $props();

	let svgEl: SVGSVGElement;
	let dragging = $state(false);

	// SVG geometry (viewBox 0..100, centre 50,50, radius 40).
	const C = 50;
	const R = 40;
	// Screen position of the handle: 0° = up, clockwise.
	const rad = $derived(((value - 90) * Math.PI) / 180);
	const hx = $derived(C + R * Math.cos(rad));
	const hy = $derived(C + R * Math.sin(rad));

	function emit(): void {
		oninput?.();
		onCommit?.();
	}

	function clampStep(v: number): number {
		const s = Math.max(1e-6, Math.abs(step));
		return Math.max(min, Math.min(max, Math.round(v / s) * s));
	}

	function setFromPoint(clientX: number, clientY: number): void {
		const rect = svgEl.getBoundingClientRect();
		const dx = clientX - (rect.left + rect.width / 2);
		const dy = clientY - (rect.top + rect.height / 2);
		// compass angle: 0° up, clockwise
		let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
		deg = ((deg % 360) + 360) % 360; // 0..360
		// map into the requested range (full-circle ranges wrap; otherwise clamp)
		if (max - min >= 359) {
			value = min + ((deg - min) % (max - min) + (max - min)) % (max - min);
		} else {
			value = clampStep(deg);
		}
		emit();
	}

	function onDown(e: PointerEvent): void {
		dragging = true;
		(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
		setFromPoint(e.clientX, e.clientY);
	}
	function onMove(e: PointerEvent): void {
		if (!dragging) return;
		setFromPoint(e.clientX, e.clientY);
	}
	function onUp(e: PointerEvent): void {
		dragging = false;
		const el = e.currentTarget as SVGSVGElement;
		if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
	}

	function commitText(text: string): void {
		const n = parseFloat(text);
		if (Number.isFinite(n)) {
			value = clampStep(n);
			emit();
		}
	}

	function nudge(dir: number, e: KeyboardEvent): void {
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		e.preventDefault();
		value = clampStep(value + (e.key === 'ArrowUp' ? 1 : -1) * dir * step);
		emit();
	}

	function reset(): void {
		value = dflt;
		emit();
	}
</script>

<div class="ang">
	{#if label}<span class="ang-label">{label}</span>{/if}
	<div class="ang-body">
		<svg
			class="ang-svg"
			viewBox="0 0 100 100"
			bind:this={svgEl}
			onpointerdown={onDown}
			onpointermove={onMove}
			onpointerup={onUp}
			onpointercancel={onUp}
		>
			<circle cx={C} cy={C} r={R} class="ang-ring" />
			<line x1={C} y1={C} x2={hx} y2={hy} class="ang-line" />
			<circle cx={hx} cy={hy} r="6" class="ang-handle" />
		</svg>
		<div class="ang-side">
			<input
				class="ang-num"
				type="number"
				min={min}
				max={max}
				step={step}
				value={Math.round(value)}
				title="Angle (degrees)"
				onchange={(e) => commitText((e.currentTarget as HTMLInputElement).value)}
				onkeydown={(e) => {
					if (e.key === 'Enter') commitText((e.currentTarget as HTMLInputElement).value);
					nudge(1, e);
				}}
			/>
			<button
				class="ang-reset"
				type="button"
				title="Reset angle to default"
				aria-label="Reset angle to default"
				disabled={value === dflt}
				onclick={reset}
			>↺</button>
		</div>
	</div>
</div>
