<script lang="ts">
	import { foregroundColor, backgroundColor } from '../../state/ui';
	import type { RGBA } from '../../core/color';

	let areaEl: HTMLDivElement | undefined = $state();
	let dragging = false;
	let moved = false;
	let downX = 0;
	let downY = 0;
	/** Double-click detector. `dblclick` only ever fires for the primary
	 * button, so the right-button half of every gesture is tracked by hand —
	 * `zone` keeps a click on one control from pairing with a click on
	 * another. */
	let lastClick = { button: -1, time: 0, zone: '' };
	const DOUBLE_MS = 400;

	let h = $state(0);
	let s = $state(0);
	let l = $state(0);
	/** Foreground alpha, 0..255. The transparency slider below the brightness
	 * one drives this; it is part of the committed colour like r/g/b. */
	let alpha = $state(255);

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
		// Outside the rgb guard: the alpha can change on its own (the full
		// picker panel, a reset, an eyedropper sample) while r/g/b stay put.
		// `alpha` is never read by this effect, so writing it cannot loop.
		alpha = c.a;
	});

	function commit() {
		foregroundColor.set({ ...hslToRgb(h, s, l), a: alpha });
	}

	function applySelected(hue: number, sat: number, lum: number, toBackground: boolean) {
		const rgb = hslToRgb(hue, sat, lum);
		// The transparency slider belongs to the foreground, so it must not
		// leak into the background slot — that one keeps whatever alpha it had.
		if (toBackground) backgroundColor.update((cur) => ({ ...rgb, a: cur.a }));
		else foregroundColor.set({ ...rgb, a: alpha });
	}

	function onBrightnessInput(e: Event) {
		l = Number((e.currentTarget as HTMLInputElement).value);
		commit();
	}

	/** Transparency 0..100 (0 = opaque) — the slider's own units, derived from
	 * the alpha so the two can never drift apart. */
	const transparency = $derived(Math.round((1 - alpha / 255) * 100));

	function onTransparencyInput(e: Event) {
		const t = Number((e.currentTarget as HTMLInputElement).value);
		alpha = Math.round((1 - t / 100) * 255);
		commit();
	}

	/** True when this pointerup completes a double click with the SAME button on
	 * the SAME control. */
	function isDoubleClick(e: PointerEvent, zone: string): boolean {
		const dbl =
			e.button === lastClick.button && lastClick.zone === zone && e.timeStamp - lastClick.time < DOUBLE_MS;
		lastClick = { button: e.button, time: e.timeStamp, zone };
		return dbl;
	}

	/** Double-click on the brightness slider: left snaps to dark, right to
	 * bright — the slider's two ends, in the same left/right order the swatch
	 * area uses. A range input never reports a right-button change, so this is
	 * the only way to reach the bright end with the right button. */
	function onBrightnessUp(e: PointerEvent) {
		if (!isDoubleClick(e, 'lightness')) return;
		l = e.button === 2 ? 100 : 0;
		commit();
	}

	/** Double-click on the transparency slider. It reads TRANSPARENCY, so the
	 * ends are the other way round: left = opaque (alpha 255), right =
	 * invisible (alpha 0). */
	function onTransparencyUp(e: PointerEvent) {
		if (!isDoubleClick(e, 'alpha')) return;
		alpha = e.button === 2 ? 0 : 255;
		commit();
	}

	function pointerPos(e: PointerEvent): [number, number] {
		const rect = areaEl!.getBoundingClientRect();
		const sat = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100);
		const hue = Math.round(Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) * 360);
		return [hue, sat];
	}

	function onAreaDown(e: PointerEvent) {
		e.preventDefault();
		moved = false;
		downX = e.clientX;
		downY = e.clientY;
		const el = e.currentTarget as HTMLElement;
		try {
			el.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		if (e.button === 2) return; // right click handled on pointerup
		dragging = true;
		const [nh, ns] = pointerPos(e);
		h = nh;
		s = ns;
		commit();
		el.blur();
	}
	function onAreaMove(e: PointerEvent) {
		if (!dragging) return;
		if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) moved = true;
		const [nh, ns] = pointerPos(e);
		h = nh;
		s = ns;
		commit();
	}
	function onAreaUp(e: PointerEvent) {
		const isRight = e.button === 2;
		const isDouble = isDoubleClick(e, 'area');
		dragging = false;

		if (isRight) {
			const [nh, ns] = pointerPos(e);
			if (isDouble) applySelected(nh, ns, 50, true); // double right-click: background at 50%
			else applySelected(nh, ns, l, true); // right-click: background at slider brightness
			return;
		}
		if (moved) return; // a left drag already set the foreground
		if (isDouble) {
			const [nh, ns] = pointerPos(e);
			applySelected(nh, ns, 50, false); // double left-click: foreground at 50%
		}
	}
	function onAreaKeyDown(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Backspace' || e.key === 'Delete') {
			(e.currentTarget as HTMLElement)?.blur();
		}
	}

	const lightnessPct = '50%'; // area is always vivid: lightness comes only from the slider below
	const hslCss = $derived(`hsl(${h}, ${s}%, ${l}%)`);
	const sliderGradient = $derived(
		`linear-gradient(to right, hsl(${h}, ${s}%, 0%) 0%, hsl(${h}, ${s}%, 50%) 50%, hsl(${h}, ${s}%, 100%) 100%)`
	);
	/** Opaque colour -> same colour at alpha 0, over a checkerboard. */
	const alphaFrom = $derived(`hsl(${h}, ${s}%, ${l}%)`);
	const alphaTo = $derived(`hsla(${h}, ${s}%, ${l}%, 0)`);
	const alphaThumb = $derived(`hsla(${h}, ${s}%, ${l}%, ${(alpha / 255).toFixed(3)})`);
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
		oncontextmenu={(e) => e.preventDefault()}
		onkeydown={onAreaKeyDown}
	>
		<div class="fg-crosshair" style="left:{s}%; top:{(h / 360) * 100}%;"></div>
	</div>
	<input
		type="range"
		class="fg-bright-slider"
		aria-label="Foreground brightness"
		title="Brightness — double-click left for dark, right for bright"
		min="0"
		max="100"
		value={l}
		oninput={onBrightnessInput}
		onpointerdown={(e) => (e.currentTarget as HTMLElement)?.blur()}
		onpointerup={onBrightnessUp}
		oncontextmenu={(e) => e.preventDefault()}
		onkeydown={onAreaKeyDown}
		style="background:{sliderGradient}; --thumb-color:{hslCss};"
	/>
	<!-- Transparency: alpha of the foreground. 0 = opaque, 100 = invisible. -->
	<input
		type="range"
		class="fg-alpha-slider"
		aria-label="Foreground transparency"
		title="Transparency — double-click left for alpha 100, right for alpha 0"
		min="0"
		max="100"
		value={transparency}
		oninput={onTransparencyInput}
		onpointerdown={(e) => (e.currentTarget as HTMLElement)?.blur()}
		onpointerup={onTransparencyUp}
		oncontextmenu={(e) => e.preventDefault()}
		onkeydown={onAreaKeyDown}
		style="--alpha-from:{alphaFrom}; --alpha-to:{alphaTo}; --thumb-color:{alphaThumb};"
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
	.fg-bright-slider,
	.fg-alpha-slider {
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
	/* Opaque colour fading to nothing over a transparency checkerboard, so the
	   track reads as "solid at the left, see-through at the right" whatever the
	   hue is. The checkerboard is mid-grey rather than the swatches' near-black:
	   an opaque BLACK left end has to stand out against it, and against #383838
	   it simply disappeared. */
	.fg-alpha-slider {
		background-image:
			linear-gradient(to right, var(--alpha-from, #000) 0%, var(--alpha-to, transparent) 100%),
			repeating-conic-gradient(#6a6a6a 0% 25%, #454545 0% 50%);
		background-size: auto, 6px 6px;
	}
	.fg-bright-slider::-webkit-slider-thumb,
	.fg-alpha-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--thumb-color, #ffffff);
		border: 2px solid #ffffff;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
	}
	.fg-bright-slider::-moz-range-thumb,
	.fg-alpha-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--thumb-color, #ffffff);
		border: 2px solid #ffffff;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
	}
</style>
