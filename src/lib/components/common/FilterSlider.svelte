<script lang="ts">
	// Layer: components. A labelled slider row for filter dialogs: a range track
	// with the value shown as an EDITABLE number field on the right, plus an
	// icon-only reset button that restores the default value. Changes flow up
	// through `oninput`/`onCommit` so the caller can live-preview + persist.
	//
	// When a `gradient` CSS string is given it is painted behind the track
	// (the native track is made transparent so the colour bar shows through).
	interface Props {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		/** the value the reset button restores the slider to */
		default: number;
		/** CSS background value (gradient or colour) painted behind the track */
		gradient?: string;
		oninput?: () => void;
		onCommit?: () => void;
	}
	let { label, value = $bindable(), min, max, step = 1, default: dflt, gradient, oninput, onCommit }: Props = $props();

	function reset(): void {
		value = dflt;
		oninput?.();
		onCommit?.();
	}

	function clampToRange(v: number): number {
		const s = Math.max(1e-6, Math.abs(step));
		return Math.max(min, Math.min(max, Math.round(v / s) * s));
	}

	function commitText(text: string): void {
		const n = parseFloat(text);
		if (Number.isFinite(n)) {
			value = clampToRange(n);
			oninput?.();
			onCommit?.();
		}
	}
</script>

<label class="fsl">
	<span class="fsl-label">{label}</span>
	<span class="fsl-row">
		<span class="fsl-track-wrap">
			{#if gradient}
				<span class="fsl-gradient" style="background:{gradient}"></span>
			{/if}
			<input
				class="fsl-range"
				class:fsl-range-grad={!!gradient}
				type="range"
				min={min}
				max={max}
				step={step}
				bind:value
				oninput={oninput}
				onchange={oninput}
			/>
		</span>
		<input
			class="fsl-num"
			type="number"
			min={min}
			max={max}
			step={step}
			value={value}
			title="Edit value"
			onchange={(e) => commitText((e.currentTarget as HTMLInputElement).value)}
			onkeydown={(e) => {
				if (e.key === 'Enter') commitText((e.currentTarget as HTMLInputElement).value);
			}}
		/>
		<button
			class="fsl-reset"
			type="button"
			title="Reset to default"
			aria-label="Reset to default"
			disabled={value === dflt}
			onclick={reset}
		>↺</button>
	</span>
</label>
