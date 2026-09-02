<script lang="ts">
	// Layer: components. Overlapping foreground/background swatches (native color
	// inputs; no text labels). Foreground is the larger front square, background
	// sits smaller and slightly behind/offset beneath it.
	import { foregroundColor, backgroundColor } from '../../state/ui';

	function swap() {
		const fg = $foregroundColor;
		const bg = $backgroundColor;
		foregroundColor.set(bg);
		backgroundColor.set(fg);
	}
	function reset() {
		foregroundColor.set('#000000');
		backgroundColor.set('#ffffff');
	}
</script>

<div class="flex h-full items-center gap-2 pl-0 pr-2">
	<div class="color-stack">
		<label class="cs-bg" style="background:{$backgroundColor};" title="Background colour">
			<input type="color" bind:value={$backgroundColor} class="swatch-input" aria-label="Background colour" />
		</label>
		<label class="cs-fg" style="background:{$foregroundColor};" title="Foreground colour">
			<input type="color" bind:value={$foregroundColor} class="swatch-input" aria-label="Foreground colour" />
		</label>
	</div>
	<button class="mini-btn" title="Swap colours (X)" onclick={swap}>⇄</button>
	<button class="mini-btn" title="Reset (D)" onclick={reset}>↺</button>
</div>
