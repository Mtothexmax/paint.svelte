<script lang="ts">
	import './EffectSelect.css';
	// Layer: components. A labelled dropdown row for effect UIs whose param has
	// kind === 'select': renders a native <select> over the param's `options`
	// and stores the chosen option's numeric value in the setting. Changes flow
	// up through `oninput` (live preview) / `onCommit` (persistence).
	//
	// Use this for a genuine enumeration. A slider is the wrong control for a
	// fixed set of named choices — the old Motion Blur "Edge Behavior" had to
	// spell its options out in the label ("0:Clamp, 1:Wrap, 2:Mirror,
	// 3:Transparent") because a range track cannot show them.
	interface Props {
		label: string;
		value: number;
		options: { value: number; label: string }[];
		/** the value the reset button restores */
		default: number;
		oninput?: () => void;
		onCommit?: () => void;
	}
	let { label, value = $bindable(), options, default: dflt, oninput, onCommit }: Props = $props();

	function changed(): void {
		oninput?.();
		onCommit?.();
	}

	function reset(): void {
		value = dflt;
		oninput?.();
		onCommit?.();
	}
</script>

<label class="fsel">
	<span class="fsel-label">{label}</span>
	<span class="fsel-row">
		<!-- `bind:value` on a <select> keeps the option's real type, so the
		     numeric `value` round-trips into settings as a number. -->
		<select class="fsel-input" bind:value onchange={changed}>
			{#each options as o (o.value)}
				<option value={o.value}>{o.label}</option>
			{/each}
		</select>
		<button
			class="fsel-reset"
			type="button"
			title="Reset to default"
			aria-label="Reset to default"
			disabled={value === dflt}
			onclick={reset}
		>↺</button>
	</span>
</label>
