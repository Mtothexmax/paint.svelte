<script lang="ts">
	import './ColorPicker.css';
	// Layer: components/common. Reusable HSV (+alpha) color picker — the core
	// extracted from the fullscreen ColorPickerPanel, usable anywhere:
	// - ColorPickerPanel wires it to the foreground/background slot stores.
	// - EffectColorRow embeds the compact, alpha-less variant so effect
	//   params (e.g. Outline's color) can pick arbitrary colors, not just
	//   copy fg/bg.
	import {
		rgbToHsv,
		hsvToRgb,
		rgbaToHex,
		rgbaToCss,
		parseColorText,
		type RGBA
	} from '../../core/color';
	import { showNotice } from '../../state/ui';

	interface Props {
		/** Live color. Updated on every change (drag/field/quick). */
		value: RGBA;
		/** Called on every change for live preview. */
		oninput?: (c: RGBA) => void;
		/** Called on discrete applies (drag end, field/hex/quick pick)
		 * for persistence. */
		onCommit?: (c: RGBA) => void;
		/** Show the alpha strip + alpha readout/field. Color params that
		 * store opaque 0xRRGGBB pass false. */
		withAlpha?: boolean;
		/** 'full' = fullscreen-mode layout (viewport-driven stage);
		 * 'compact' = stacked, fixed-height stage for embedding in popups. */
		layout?: 'full' | 'compact';
	}

	let {
		value = $bindable(),
		oninput,
		onCommit,
		withAlpha = true,
		layout = 'full'
	}: Props = $props();

	// ---- local editable model (h, s, v / alpha 0..255) -------------------
	const initHsv = rgbToHsv(value.r, value.g, value.b);
	let hue = $state(initHsv.h);
	let sat = $state(initHsv.s);
	let val = $state(initHsv.v);
	let alpha = $state(value.a);
	const current = $derived(hsvToRgb(hue, sat, val)); // {r,g,b}
	const rgba = $derived<RGBA>({ r: current.r, g: current.g, b: current.b, a: alpha });
	const hueColor = $derived(
		rgbaToCss({ r: hsvToRgb(hue, 1, 1).r, g: hsvToRgb(hue, 1, 1).g, b: hsvToRgb(hue, 1, 1).b, a: 255 }, false)
	);
	const opaqueCss = $derived(rgbaToCss({ r: current.r, g: current.g, b: current.b, a: 255 }, false));

	// External change (e.g. parent picked fg while open) → resync the model.
	// Guarded by comparison (ToolbarColorPicker pattern) so our own pushes
	// can't ping-pong.
	$effect(() => {
		const v = value;
		if (
			v.r !== rgba.r ||
			v.g !== rgba.g ||
			v.b !== rgba.b ||
			(withAlpha && v.a !== rgba.a)
		) {
			const hsv = rgbToHsv(v.r, v.g, v.b, hue);
			hue = hsv.h;
			sat = hsv.s;
			val = hsv.v;
			if (withAlpha) alpha = v.a;
		}
	});

	/** Push the local model to the parent. `commit` marks discrete applies. */
	function push(commit: boolean) {
		const c: RGBA = withAlpha ? { ...rgba } : { r: rgba.r, g: rgba.g, b: rgba.b, a: 255 };
		value = c;
		oninput?.(c);
		if (commit) onCommit?.(c);
	}

	function clampRatio(n: number) {
		return Math.max(0, Math.min(1, n));
	}

	// ---- field setters ---------------------------------------------------
	const fieldInt = (s: string, hi: number, fallback: number) => {
		const n = parseInt(s, 10);
		return Number.isFinite(n) ? Math.max(0, Math.min(hi, n)) : fallback;
	};

	function setHex(input: string) {
		const parsed = parseColorText(input);
		if (!parsed) return;
		const c = parsed.color;
		const hsv = rgbToHsv(c.r, c.g, c.b);
		hue = hsv.h;
		sat = hsv.s;
		val = hsv.v;
		if (withAlpha) alpha = c.a;
		push(true);
	}

	function byteHex(n: number) {
		return Math.round(n).toString(16).padStart(2, '0');
	}
	function setRgb(e: Event, ch: 'r' | 'g' | 'b') {
		const v = fieldInt((e.currentTarget as HTMLInputElement).value, 255, 0);
		const rgb = hsvToRgb(hue, sat, val);
		const next = { r: rgb.r, g: rgb.g, b: rgb.b };
		next[ch] = v;
		const hsv = rgbToHsv(next.r, next.g, next.b, hue);
		hue = hsv.h;
		sat = hsv.s;
		val = hsv.v;
		push(true);
	}

	// ---- quick palette ---------------------------------------------------
	const QUICK: Array<{ hex: string; a?: number }> = [
		{ hex: '#000000' },
		{ hex: '#ffffff' },
		{ hex: '#808080' },
		{ hex: '#dcdcdc' },
		{ hex: '#ff0000' },
		{ hex: '#ff8000' },
		{ hex: '#ffff00' },
		{ hex: '#00ff00' },
		{ hex: '#00ffff' },
		{ hex: '#0000ff' },
		{ hex: '#8000ff' },
		{ hex: '#ff00ff' },
		{ hex: '#ff4081' },
		{ hex: '#3f51b5' },
		{ hex: '#009688' },
		{ hex: '#795548' }
	];

	function applyQuick(hex: string) {
		const c = parseColorText(hex);
		if (c) {
			const hsv = rgbToHsv(c.color.r, c.color.g, c.color.b);
			hue = hsv.h;
			sat = hsv.s;
			val = hsv.v;
			if (withAlpha) alpha = c.color.a;
			push(true);
		}
	}

	function copyCurrent() {
		const hex = rgbaToHex(rgba);
		navigator.clipboard
			.writeText(hex)
			.then(() => showNotice(`Copied ${hex}`))
			.catch(() => showNotice('Could not copy to clipboard.', 'error'));
	}

	// ---- drag helpers ----------------------------------------------------
	function bindRatio(el: HTMLElement, e: PointerEvent, axis: 'x' | 'y' | 'xy', onRatio: (x: number, y: number) => void) {
		e.preventDefault();
		try {
			el.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		const apply = (ev: PointerEvent) => {
			const r = el.getBoundingClientRect();
			const x = clampRatio((ev.clientX - r.left) / Math.max(r.width, 1));
			const y = clampRatio((ev.clientY - r.top) / Math.max(r.height, 1));
			if (axis === 'x') onRatio(x, 0.5);
			else if (axis === 'y') onRatio(0.5, y);
			else onRatio(x, y);
		};
		apply(e);
	}

	function svPointer(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		el.blur();
		bindRatio(el, e, 'xy', (x, y) => {
			sat = x;
			val = 1 - y;
			push(false);
		});
	}
	function svMove(e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		if (!el.hasPointerCapture(e.pointerId)) return;
		const r = el.getBoundingClientRect();
		sat = clampRatio((e.clientX - r.left) / Math.max(r.width, 1));
		val = 1 - clampRatio((e.clientY - r.top) / Math.max(r.height, 1));
		push(false);
	}
	function stripPointer(axis: 'hue' | 'alpha', e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		el.blur();
		bindRatio(el, e, 'y', (_x, y) => {
			if (axis === 'hue') hue = y * 360;
			else alpha = Math.round((1 - y) * 255);
			push(false);
		});
	}
	function stripMove(axis: 'hue' | 'alpha', e: PointerEvent) {
		const el = e.currentTarget as HTMLElement;
		if (!el.hasPointerCapture(e.pointerId)) return;
		const r = el.getBoundingClientRect();
		const y = clampRatio((e.clientY - r.top) / Math.max(r.height, 1));
		if (axis === 'hue') hue = y * 360;
		else alpha = Math.round((1 - y) * 255);
		push(false);
	}
	/** Drag end → discrete commit for persistence. */
	function dragEnd() {
		onCommit?.(withAlpha ? { ...rgba } : { r: rgba.r, g: rgba.g, b: rgba.b, a: 255 });
	}
</script>

<div class="cp-body" class:compact={layout === 'compact'} oncontextmenu={(e) => e.preventDefault()}>
	<div class="cp-stage">
		<!-- SV surface -->
		<div
			class="cp-sv"
			style="--hue-css:{hueColor};"
			role="slider"
			tabindex="0"
			aria-label="Saturation and brightness"
			onpointerdown={svPointer}
			onpointermove={svMove}
			onpointerup={dragEnd}
			onpointercancel={dragEnd}
		>
			<div
				class="cp-handle"
				style="left:{sat * 100}%; top:{(1 - val) * 100}%; background:{rgbaToCss(rgba)};"
			></div>
		</div>

		<!-- hue + alpha strips -->
		<div class="cp-strips">
			<div
				class="cp-strip cp-hue"
				role="slider"
				tabindex="0"
				aria-label="Hue"
				onpointerdown={(e) => stripPointer('hue', e)}
				onpointermove={(e) => stripMove('hue', e)}
				onpointerup={dragEnd}
				onpointercancel={dragEnd}
			>
				<div class="cp-strip-handle" style="top:{hue / 360 * 100}%; background:{hueColor};"></div>
			</div>
			{#if withAlpha}
				<div
					class="cp-strip cp-alpha"
					style="--opaque:{opaqueCss};"
					role="slider"
					tabindex="0"
					aria-label="Alpha"
					onpointerdown={(e) => stripPointer('alpha', e)}
					onpointermove={(e) => stripMove('alpha', e)}
					onpointerup={dragEnd}
					onpointercancel={dragEnd}
				>
					<div class="cp-strip-handle" style="top:{(1 - alpha / 255) * 100}%; background:{rgbaToCss(rgba)};"></div>
				</div>
			{/if}
		</div>
	</div>

	<!-- right: readout -->
	<div class="cp-fields">
		<div class="cp-preview">
			<div class="cp-preview-swatch" style="--swatch:{rgbaToCss(rgba)};"></div>
			<div>
				<div class="cp-hex">#{byteHex(rgba.r)}{byteHex(rgba.g)}{byteHex(rgba.b)}</div>
				{#if withAlpha}<div class="cp-alpha-pct">Alpha {alpha}</div>{/if}
			</div>
			<button class="mini-btn" title="Copy" onclick={copyCurrent}>⧉</button>
		</div>

		<div class="cp-num-grid" style="grid-template-columns: repeat({withAlpha ? 4 : 3}, 1fr);">
			<label class="cp-num">R<input type="number" min="0" max="255" value={rgba.r} oninput={(e) => setRgb(e, 'r')} /></label>
			<label class="cp-num">G<input type="number" min="0" max="255" value={rgba.g} oninput={(e) => setRgb(e, 'g')} /></label>
			<label class="cp-num">B<input type="number" min="0" max="255" value={rgba.b} oninput={(e) => setRgb(e, 'b')} /></label>
			{#if withAlpha}
				<label class="cp-num">A<input type="number" min="0" max="255" value={alpha} oninput={(e) => { alpha = fieldInt((e.currentTarget as HTMLInputElement).value, 255, alpha); push(true); }} /></label>
			{/if}
		</div>

		<label class="cp-hexfield">
			<span>Hex</span>
			<input
				type="text"
				spellcheck="false"
				placeholder="#rrggbb"
				value={rgbaToHex(rgba)}
				onchange={(e) => setHex((e.currentTarget as HTMLInputElement).value)}
				onkeydown={(e) => e.key === 'Enter' && setHex((e.currentTarget as HTMLInputElement).value)}
			/>
		</label>

		<div class="cp-quick">
			{#each QUICK as q (q.hex)}
				<button
					class="cp-chip"
					style="background:{q.hex};"
					title={q.hex}
					onclick={() => applyQuick(q.hex)}
				></button>
			{/each}
		</div>
	</div>
</div>
