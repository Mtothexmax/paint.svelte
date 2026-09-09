<script lang="ts">
	import './XYPicker.css';
	// Layer: components. Reusable 2D position picker (FL Studio style XY pad):
	// a square pad you click / drag to place a point, plus editable X / Y number
	// fields each with its own reset button. Bindable `value` is { x, y }.
	//
	// The pad maps left→minX, right→maxX and TOP→maxY (bottom→minY), so it
	// behaves like a normal maths graph. Both axes default to -100..100.
	interface Props {
		value: { x: number; y: number };
		minX?: number;
		maxX?: number;
		minY?: number;
		maxY?: number;
		/** quantisation step for both axes */
		step?: number;
		/** the per-axis value the reset buttons restore */
		default: { x: number; y: number };
		label?: string;
		oninput?: () => void;
		onCommit?: () => void;
	}
	let {
		value = $bindable(),
		minX = -100,
		maxX = 100,
		minY = -100,
		maxY = 100,
		step = 1,
		default: dflt,
		label,
		oninput,
		onCommit
	}: Props = $props();

	let padEl: HTMLDivElement;
	let dragging = $state(false);

	// Normalised 0..1 positions within the pad (y inverted: top = maxY).
	const tx = $derived((value.x - minX) / (maxX - minX));
	const ty = $derived(1 - (value.y - minY) / (maxY - minY));

	function clampStep(v: number, lo: number, hi: number): number {
		const s = Math.max(1e-6, Math.abs(step));
		return Math.max(lo, Math.min(hi, Math.round(v / s) * s));
	}

	function emit(): void {
		oninput?.();
		onCommit?.();
	}

	function setFromPoint(clientX: number, clientY: number): void {
		const rect = padEl.getBoundingClientRect();
		const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
		const x = clampStep(minX + nx * (maxX - minX), minX, maxX);
		const y = clampStep(maxY - ny * (maxY - minY), minY, maxY);
		value = { x, y };
		emit();
	}

	function onPadDown(e: PointerEvent): void {
		dragging = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		setFromPoint(e.clientX, e.clientY);
	}
	function onPadMove(e: PointerEvent): void {
		if (!dragging) return;
		setFromPoint(e.clientX, e.clientY);
	}
	function onPadUp(e: PointerEvent): void {
		dragging = false;
		const el = e.currentTarget as HTMLElement;
		if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
	}

	function commitText(which: 'x' | 'y', text: string): void {
		const n = parseFloat(text);
		if (!Number.isFinite(n)) return;
		if (which === 'x') value = { x: clampStep(n, minX, maxX), y: value.y };
		else value = { x: value.x, y: clampStep(n, minY, maxY) };
		emit();
	}

	// Arrow-key nudge on the number fields.
	function nudge(which: 'x' | 'y', dir: number, e: KeyboardEvent): void {
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		e.preventDefault();
		const d = (e.key === 'ArrowUp' ? 1 : -1) * dir * step;
		if (which === 'x') value = { x: clampStep(value.x + d, minX, maxX), y: value.y };
		else value = { x: value.x, y: clampStep(value.y + d, minY, maxY) };
		emit();
	}

	function resetX(): void {
		value = { x: dflt.x, y: value.y };
		emit();
	}
	function resetY(): void {
		value = { x: value.x, y: dflt.y };
		emit();
	}
</script>

<div class="xyp">
	{#if label}<span class="xyp-label">{label}</span>{/if}
	<div class="xyp-body">
		<div
			class="xyp-pad"
			bind:this={padEl}
			onpointerdown={onPadDown}
			onpointermove={onPadMove}
			onpointerup={onPadUp}
			onpointercancel={onPadUp}
		>
			<div class="xyp-dot" style="left:{tx * 100}%; top:{ty * 100}%"></div>
		</div>

		<div class="xyp-fields">
			<div class="xyp-field">
				<span class="xyp-tag">X</span>
				<input
					class="xyp-num"
					type="number"
					min={minX}
					max={maxX}
					step={step}
					value={value.x}
					title="X value"
					onchange={(e) => commitText('x', (e.currentTarget as HTMLInputElement).value)}
					onkeydown={(e) => {
						if (e.key === 'Enter') commitText('x', (e.currentTarget as HTMLInputElement).value);
						nudge('x', 1, e);
					}}
				/>
				<button
					class="xyp-reset"
					type="button"
					title="Reset X to default"
					aria-label="Reset X to default"
					disabled={value.x === dflt.x}
					onclick={resetX}
				>↺</button>
			</div>

			<div class="xyp-field">
				<span class="xyp-tag">Y</span>
				<input
					class="xyp-num"
					type="number"
					min={minY}
					max={maxY}
					step={step}
					value={value.y}
					title="Y value"
					onchange={(e) => commitText('y', (e.currentTarget as HTMLInputElement).value)}
					onkeydown={(e) => {
						if (e.key === 'Enter') commitText('y', (e.currentTarget as HTMLInputElement).value);
						nudge('y', 1, e);
					}}
				/>
				<button
					class="xyp-reset"
					type="button"
					title="Reset Y to default"
					aria-label="Reset Y to default"
					disabled={value.y === dflt.y}
					onclick={resetY}
				>↺</button>
			</div>
		</div>
	</div>
</div>
