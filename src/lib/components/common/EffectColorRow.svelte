<script lang="ts">
	import './EffectColorRow.css';
	// Layer: components. A color row for effect UIs whose param has
	// kind === 'color': shows the currently stored color in a rectangle plus
	// buttons that copy the foreground / background color into the setting
	// (stored as packed 0xRRGGBB), plus an inline custom picker (the shared
	// ColorPicker, compact and alpha-less) for arbitrary colors — e.g. the
	// Outline filter. Changes flow up through `oninput` (live preview) /
	// `onCommit` (persistence).
	import ColorPicker from './ColorPicker.svelte';
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

	let customOpen = $state(false);

	function toPacked(c: RGBA): number {
		return ((c.r & 255) << 16) | ((c.g & 255) << 8) | (c.b & 255);
	}

	function toRgba(v: number): RGBA {
		const c = Math.max(0, Math.floor(v)) & 0xffffff;
		return { r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255, a: 255 };
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

	/** Arbitrary color from the inline picker (always opaque — packed). */
	function pickCustom(c: RGBA): void {
		value = toPacked(c);
		oninput?.();
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
	<button
		type="button"
		class="fcol-btn"
		class:on={customOpen}
		title="Pick a custom color"
		aria-expanded={customOpen}
		onclick={() => (customOpen = !customOpen)}
	>
		<span class="fcol-swatch fcol-rainbow" aria-hidden="true"></span>
		<span>Custom color</span>
	</button>
	{#if customOpen}
		<div class="fcol-custom">
			<ColorPicker
				value={toRgba(value)}
				layout="compact"
				withAlpha={false}
				oninput={pickCustom}
				onCommit={() => onCommit?.()}
			/>
		</div>
	{/if}
</div>