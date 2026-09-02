<script lang="ts">
	// Reusable slider row used inside a context menu.
	interface Props {
		label: string;
		min: number;
		max: number;
		step?: number;
		value: number;
		oninput: (v: number) => void;
	}
	let { label, min, max, step = 1, value, oninput }: Props = $props();

	let val = $state(value);
	function changed() {
		oninput(val);
	}
</script>

<label class="ctx-item ctx-slider">
	<span class="ctx-slider-label">{label}</span>
	<div class="ctx-slider-control">
		<input type="range" min={min} max={max} step={step} bind:value={val} oninput={changed} />
		<span class="ctx-slider-value">{val}</span>
	</div>
</label>
