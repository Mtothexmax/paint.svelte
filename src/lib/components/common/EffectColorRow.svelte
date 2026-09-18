<script lang="ts">
	import './EffectColorRow.css';
	// Layer: components. A color row for effect UIs whose param has
	// kind === 'color': shows the currently stored color in a rectangle plus
	// buttons that copy the foreground / background color into the setting
	// (stored as packed 0xRRGGBB). Clicking the stored-color rectangle opens
	// the shared ColorPicker in a FLOATING popup (compact, alpha-less) for
	// arbitrary colors — e.g. the Drop Shadow filter — so no space is wasted
	// inside the host popup. Changes flow up through `oninput` (live
	// preview) / `onCommit` (persistence).
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
	let swatchBtn: HTMLButtonElement | undefined = $state();
	let popEl: HTMLDivElement | undefined = $state();
	let popPos = $state({ left: 0, top: 0 });

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

	/** Arbitrary color from the popup picker (always opaque — packed). */
	function pickCustom(c: RGBA): void {
		value = toPacked(c);
		oninput?.();
	}

	function togglePopup(): void {
		customOpen = !customOpen;
		if (customOpen) {
			// First guess under the swatch; clamped to the viewport once the
			// popup has laid out (next frame).
			const r = swatchBtn?.getBoundingClientRect();
			popPos = { left: r?.left ?? 0, top: (r?.bottom ?? 0) + 6 };
			requestAnimationFrame(() => clampPopup(r));
		}
	}

	/** Keeps the floating popup inside the viewport (flips above the swatch
	 * when there is no room below). `anchor` is the swatch rect, if known. */
	function clampPopup(anchor?: DOMRect): void {
		if (!popEl) return;
		const vw = document.documentElement.clientWidth || window.innerWidth;
		const vh = document.documentElement.clientHeight || window.innerHeight;
		const r = popEl.getBoundingClientRect();
		let left = popPos.left;
		let top = popPos.top;
		if (left + r.width > vw - 8) left = Math.max(8, vw - r.width - 8);
		if (top + r.height > vh - 8) {
			const above = (anchor?.top ?? top) - r.height - 6;
			top = Math.max(8, above);
		}
		popPos = { left: Math.max(8, left), top };
	}

	// While open: outside click closes (the click itself still goes
	// through); first Escape closes just the popup (capture runs before any
	// host dialog's bubble Escape-to-close).
	$effect(() => {
		if (!customOpen) return;
		const onDown = (e: MouseEvent) => {
			if (!(e.target as HTMLElement | null)?.closest('.fcol-pop-anchor')) customOpen = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				customOpen = false;
			}
		};
		const onResize = () => clampPopup(swatchBtn?.getBoundingClientRect());
		document.addEventListener('mousedown', onDown, true);
		window.addEventListener('keydown', onKey, true);
		window.addEventListener('resize', onResize);
		return () => {
			document.removeEventListener('mousedown', onDown, true);
			window.removeEventListener('keydown', onKey, true);
			window.removeEventListener('resize', onResize);
		};
	});
</script>

<div class="fcol">
	<span class="fcol-label">{label}</span>
	<span class="fcol-pop-anchor">
		<button
			type="button"
			bind:this={swatchBtn}
			class="fcol-stored"
			style="background:{toCss(value)}"
			title="Pick a custom color"
			aria-label="Pick a custom color"
			aria-haspopup="dialog"
			aria-expanded={customOpen}
			onclick={togglePopup}
		></button>
	</span>
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
{#if customOpen}
	<div
		bind:this={popEl}
		class="fcol-color-pop"
		role="dialog"
		aria-label="Pick a custom color"
		style="left:{popPos.left}px; top:{popPos.top}px;"
	>
		<ColorPicker
			value={toRgba(value)}
			layout="compact"
			withAlpha={false}
			oninput={pickCustom}
			onCommit={() => onCommit?.()}
		/>
	</div>
{/if}
