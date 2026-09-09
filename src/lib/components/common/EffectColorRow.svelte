<script lang="ts">
	import './EffectColorRow.css';
	// Layer: components. A color row for effect UIs whose param has
	// kind === 'color': shows the currently stored color in a rectangle plus
	// two buttons that copy the foreground / background color into the
	// setting (stored as packed 0xRRGGBB). Changes flow up through
	// `oninput` (live preview) / `onCommit` (persistence).
	import { foregroundColor, backgroundColor } from '../../state/ui';
	import { rgbaToCss, type RGBA } from '../../core/color';

	interface Props {
		label: string;
		/** packed 0xRRGGBB */
		value: number;
		oninput?: () => void;
		onCommit?: () => void;
	}
	let { label, value = $bindable(), oninput, onCommit }: Props = $props();

	function toPacked(c: RGBA): number {
		return ((c.r & 255) << 16) | ((c.g & 255) << 8) | (c.b & 255);
	}

	function toCss(v: number): string {
		const c = Math.max(0, Math.floor(v)) & 0xffffff;
		return '#' + c.toString(16).padStart(6, '0');
	}

	function pick(c: RGBA): void {
		value = toPacked(c);
		oninput?.();
		onCommit?.();
	}
</script>

<div class="fcol">
	<span class="fcol-label">{label}</span>
	<span class="fcol-stored" style="background:{toCss(value)}" title="Currently chosen color"></span>
	<button
		type="button"
		class="fcol-btn"
		title="Use the current foreground color"
		onclick={() => pick($foregroundColor)}
	>
		<span class="fcol-swatch" style="background:{rgbaToCss($foregroundColor, false)}"></span>
		<span>Choose foreground color</span>
	</button>
	<button
		type="button"
		class="fcol-btn"
		title="Use the current background color"
		onclick={() => pick($backgroundColor)}
	>
		<span class="fcol-swatch" style="background:{rgbaToCss($backgroundColor, false)}"></span>
		<span>Choose background color</span>
	</button>
</div>