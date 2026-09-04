<script lang="ts">
	import { foregroundColor } from '../../state/ui';
	import type { RGBA } from '../../core/color';

	let areaEl: HTMLDivElement | undefined = $state();
	let dragging = false;

	let h = $state(0);
	let s = $state(0);
	let l = $state(0);

	function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
		r /= 255; g /= 255; b /= 255;
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		const lum = (max + min) / 2;
		let hue = 0, sat = 0;
		const d = max - min;
		if (d !== 0) {
			sat = d / (1 - Math.abs(2 * lum - 1));
			switch (max) {
				case r: hue = ((g - b) / d) % 6; break;
				case g: hue = (b - r) / d + 2; break;
				default: hue = (r - g) / d + 4;
			}
			hue *= 60;
			if (hue < 0) hue += 360;
		}
		return [Math.round(hue), Math.round(sat * 100), Math.round(lum * 100)];
	}

	function hslToRgb(hue: number, sat: number, lum: number): RGBA {
		const sl = sat / 100, ll = lum / 100;
		const a = sl * Math.min(ll, 1 - ll);
		const f = (n: number) => {
			const k = (n + hue / 30) % 12;
			const c = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
			return Math.round(255 * c);
		};
		return { r: f(0), g: f(8), b: f(4), a: 255 };
	}

	$effect(() => {
		const c = $foregroundColor;
		const [nh, ns, nl] = rgbToHsl(c.r, c.g, c.b);
		if (JSON.stringify(hslToRgb(h, s, l)) !== JSON.stringify({ r: c.r, g: c.g, b: c.b, a: 255 })) {
			h = nh; s = ns; l = nl;
		}
	});

	function commit() {
		foregroundColor.set(hslToRgb(h, s, l));
	}

	function onBrightnessInput(e: Event) {
		l = Number((e.currentTarget as HTMLInputElement).value);
		commit();
	}

	function pointerPos(e: PointerEvent) {
		const rect = areaEl!.getBoundingClientRect();
		s = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100);
		h = Math.round(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) * 360);
		commit();
	}

	function onAreaDown(e: PointerEvent) {
		dragging = true;
		const el = e.currentTarget as HTMLElement;
		try {
			el.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		pointerPos(e);
		el.blur();
	}
	function onAreaMove(e: PointerEvent) {
		if (dragging) pointerPos(e);
	}
	function onAreaUp() {
		dragging = false;
	}
	function onAreaKeyDown(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Backspace' || e.key === 'Delete') {
			(e.currentTarget as HTMLElement)?.blur();
		}
	}

	const lightnessPct = $derived(`${l}%`);
	const hslCss = $derived(`hsl(${h}, ${s}%, ${l}%)`);
	const sliderGradient = $derived(
		`linear-gradient(to right, hsl(${h}, ${s}%, 0%) 0%, hsl(${h}, ${s}%, 50%) 50%, hsl(${h}, ${s}%, 100%) 100%)`
	);
</script>

<div class="fg-picker select-none">
	<div
		class="fg-picker-area"
		bind:this={areaEl}
		style="--lightness:{lightnessPct};"
		role="slider"
		aria-label="Foreground hue and saturation"
		aria-valuemin={0}
		aria-valuemax={360}
		aria-valuenow={h}
		tabindex="0"
		onpointerdown={onAreaDown}
		onpointermove={onAreaMove}
		onpointerup={onAreaUp}
		onpointercancel={onAreaUp}
		onkeydown={onAreaKeyDown}
	>
		<div class="fg-crosshair" style="left:{s}%; top:{(h / 360) * 100}%;"></div>
	</div>
	<input
		type="range"
		class="fg-bright-slider"
		aria-label="Foreground brightness"
		min="0"
		max="100"
		value={l}
		oninput={onBrightnessInput}
		onpointerdown={(e) => (e.currentTarget as HTMLElement)?.blur()}
		onkeydown={onAreaKeyDown}
		style="background:{sliderGradient}; --thumb-color:{hslCss};"
	/>
</div>

<style>
	.fg-picker {
		flex: 1 1 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 6px;
		overflow: hidden;
	}
	.fg-picker-area {
		position: relative;
		flex: 1 1 0;
		min-height: 0;
		border-radius: 8px;
		overflow: hidden;
		cursor: crosshair;
		touch-action: none;
		outline: none;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
		background: linear-gradient(
			to bottom,
			hsl(0, 100%, var(--lightness)),
			hsl(60, 100%, var(--lightness)),
			hsl(120, 100%, var(--lightness)),
			hsl(180, 100%, var(--lightness)),
			hsl(240, 100%, var(--lightness)),
			hsl(300, 100%, var(--lightness)),
			hsl(360, 100%, var(--lightness))
		);
	}
	.fg-picker-area::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to right,
			hsl(0, 0%, var(--lightness)) 0%,
			transparent 100%
		);
	}
	.fg-crosshair {
		position: absolute;
		width: 14px;
		height: 14px;
		border: 2px solid #ffffff;
		outline: 1px solid rgba(0, 0, 0, 0.6);
		border-radius: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
		box-shadow: 0 0 4px rgba(0, 0, 0, 0.6);
		z-index: 10;
	}
	.fg-bright-slider {
		flex: 0 0 auto;
		min-height: 0;
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 14px;
		border-radius: 7px;
		outline: none;
		cursor: pointer;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2), inset 0 1px 3px rgba(0, 0, 0, 0.4);
	}
	.fg-bright-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--thumb-color, #ffffff);
		border: 2px solid #ffffff;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
	}
	.fg-bright-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--thumb-color, #ffffff);
		border: 2px solid #ffffff;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
	}
</style>
