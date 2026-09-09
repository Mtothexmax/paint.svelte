<script lang="ts">
	import './LevelsDialog.css';
	// Layer: components. Paint.NET-style "Levels Adjustment" dialog: input and
	// output histograms (RGB), draggable black/white/gamma handles on two
	// gradient bars with two-way bound spinboxes, per-channel R/G/B toggles,
	// and Auto / Reset / OK / Cancel. Live preview + apply go through the
	// registered levels effect so preview and result are identical.
	import { onMount } from 'svelte';
	import MovableDialog from '../common/MovableDialog.svelte';
	import { documentRegistry } from '../../core/document/registry';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { extractSurfaceBytes } from '../../render/readback';
	import { applyFilterSwap, effectById } from '../../effects';
	import type { EffectSettings } from '../../effects';
	import { closeDialog } from '../../services/dialogService';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import { rememberLastApplied } from '../../state/repeat';

	const def = effectById('levels');

	/** Track height in px — must match .lv-track height in LevelsDialog.css. */
	const TRACK_H = 190;
	const HIST_W = 120;
	const HIST_H = 190;
	const CH_COLORS = ['#ef4444', '#22c55e', '#3b82f6'];

	const saved = def ? getSettings<EffectSettings>(`effects.levels`, def.defaults) : {};

	let inBlack = $state(saved.inBlack ?? 0);
	let inWhite = $state(saved.inWhite ?? 255);
	let gamma = $state((saved.gamma ?? 100) / 100);
	let outBlack = $state(saved.outBlack ?? 0);
	let outWhite = $state(saved.outWhite ?? 255);
	let chR = $state((saved.chR ?? 1) !== 0);
	let chG = $state((saved.chG ?? 1) !== 0);
	let chB = $state((saved.chB ?? 1) !== 0);

	let histIn: Uint32Array[] | null = $state(null);
	let inCanvas: HTMLCanvasElement | null = $state(null);
	let outCanvas: HTMLCanvasElement | null = $state(null);
	let inTrack: HTMLDivElement | null = $state(null);
	let outTrack: HTMLDivElement | null = $state(null);
	let drag: { bar: 'in' | 'out'; which: 'w' | 'b' | 'g' } | null = null;

	function toSettings(): EffectSettings {
		return {
			inBlack,
			inWhite,
			gamma: Math.round(gamma * 100),
			outBlack,
			outWhite,
			chR: chR ? 1 : 0,
			chG: chG ? 1 : 0,
			chB: chB ? 1 : 0
		};
	}

	const noop = $derived(!def || (def.isNoop?.(toSettings()) ?? false));

	function preview(): void {
		if (!def) return;
		const r = getEditorRenderer();
		const settings = toSettings();
		if (def.isNoop?.(settings) ?? false) r.setActiveLayerFilterPreview(null);
		else r.setActiveLayerFilterPreview(def.filter(settings));
	}

	// --- transfer function (mirrors the levels shader) --------------------
	function mapChannel(v: number): number {
		const span = Math.max(inWhite - inBlack, 1);
		const t = Math.min(1, Math.max(0, (v - inBlack) / span));
		const g = Math.pow(t, 1 / Math.max(gamma, 0.01));
		return Math.min(255, Math.max(0, Math.round(outBlack + g * (outWhite - outBlack))));
	}

	const midGrayVal = $derived(mapChannel(128));

	const histOut = $derived.by((): Uint32Array[] | null => {
		if (!histIn) return null;
		const out: Uint32Array[] = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
		const masks = [chR, chG, chB];
		for (let c = 0; c < 3; c++) {
			if (!masks[c]) {
				out[c].set(histIn[c]);
				continue;
			}
			for (let v = 0; v < 256; v++) out[c][mapChannel(v)] += histIn[c][v];
		}
		return out;
	});

	function gray(v: number): string {
		const c = Math.min(255, Math.max(0, Math.round(v)));
		return `rgb(${c}, ${c}, ${c})`;
	}

	// --- histogram ---------------------------------------------------------
	function computeHistogram(): void {
		const doc = documentRegistry.active;
		const layer = doc?.activeLayer;
		if (!doc || !layer) return;
		const r = getEditorRenderer();
		const { pixels } = extractSurfaceBytes(r, layer.surfaceId);
		const bins: Uint32Array[] = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
		const total = pixels.length / 4;
		const stride = Math.max(1, Math.floor(total / 500000));
		for (let i = 3; i < pixels.length; i += 4 * stride) {
			if (pixels[i] === 0) continue; // ignore fully transparent
			bins[0][pixels[i - 3]]++;
			bins[1][pixels[i - 2]]++;
			bins[2][pixels[i - 1]]++;
		}
		histIn = bins;
	}

	function drawHist(canvas: HTMLCanvasElement | null, bins: Uint32Array[] | null, dir: 'left' | 'right'): void {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const W = canvas.width;
		const H = canvas.height;
		ctx.clearRect(0, 0, W, H);
		if (!bins) return;
		let max = 1;
		for (const ch of bins) for (let i = 0; i < 256; i++) max = Math.max(max, ch[i]);
		// Upright histograms: white (255) at the top, black (0) at the bottom.
		// Counts grow outward from the edge adjacent to the bars (butterfly).
		const xOf = (v: number, len: number) => (dir === 'left' ? W - len : len);
		const edgeX = dir === 'left' ? W : 0;
		const yOf = (v: number) => H * (1 - v / 255);
		bins.forEach((ch, ci) => {
			const len = (i: number) => (ch[i] / max) * (W - 4);
			ctx.beginPath();
			ctx.moveTo(edgeX, H);
			for (let v = 0; v < 256; v++) ctx.lineTo(xOf(v, len(v)), yOf(v));
			ctx.lineTo(edgeX, 0);
			ctx.closePath();
			ctx.fillStyle = CH_COLORS[ci] + '44';
			ctx.fill();
			ctx.beginPath();
			for (let v = 0; v < 256; v++) {
				const x = xOf(v, len(v));
				if (v === 0) ctx.moveTo(x, yOf(v));
				else ctx.lineTo(x, yOf(v));
			}
			ctx.strokeStyle = CH_COLORS[ci];
			ctx.lineWidth = 1;
			ctx.stroke();
		});
	}

	$effect(() => {
		drawHist(outCanvas, histOut, 'right');
	});

	// --- track handles ------------------------------------------------------
	function yOf(v: number): number {
		return TRACK_H * (1 - v / 255);
	}
	function gammaFromT(t: number): number {
		return Math.min(10, Math.max(0.1, Math.pow(10, (0.5 - t) * 2)));
	}
	function tOfGamma(g: number): number {
		return 0.5 - Math.log10(Math.min(10, Math.max(0.1, g))) / 2;
	}
	function yOfGamma(g: number): number {
		return TRACK_H * tOfGamma(g);
	}

	function yInTrack(e: PointerEvent, el: HTMLDivElement): number {
		const r = el.getBoundingClientRect();
		const H = el.clientHeight || r.height;
		// rect.top is the outer edge; the content starts below the top border
		return Math.min(H, Math.max(0, e.clientY - r.top - (r.height - H) / 2));
	}

	function beginBar(e: PointerEvent, bar: 'in' | 'out', el: HTMLDivElement | null): void {
		if (!el || (e.target as HTMLElement).closest('input,button')) return;
		try {
			el.setPointerCapture(e.pointerId);
		} catch {
			/* synthetic event (tests) or no active pointer — continue anyway */
		}
		const y = yInTrack(e, el);
		const cands: { which: 'w' | 'b' | 'g'; y: number }[] =
			bar === 'in'
				? [
						{ which: 'w', y: yOf(inWhite) },
						{ which: 'b', y: yOf(inBlack) }
					]
				: [
						{ which: 'w', y: yOf(outWhite) },
						{ which: 'g', y: yOfGamma(gamma) },
						{ which: 'b', y: yOf(outBlack) }
					];
		let best = cands[0];
		for (const c of cands) if (Math.abs(c.y - y) < Math.abs(best.y - y)) best = c;
		drag = { bar, which: best.which };
		moveBar(e, el);
	}

	function moveBar(e: PointerEvent, el: HTMLDivElement | null): void {
		if (!drag || !el) return;
		const H = el.clientHeight || TRACK_H;
		const t = yInTrack(e, el) / H;
		const v = Math.round((1 - t) * 255);
		if (drag.bar === 'in') {
			if (drag.which === 'w') inWhite = Math.min(255, Math.max(1, Math.max(v, inBlack)));
			else inBlack = Math.max(0, Math.min(254, Math.min(v, inWhite)));
		} else {
			if (drag.which === 'w') outWhite = Math.min(255, Math.max(0, Math.max(v, outBlack)));
			else if (drag.which === 'b') outBlack = Math.max(0, Math.min(255, Math.min(v, outWhite)));
			else gamma = Math.round(gammaFromT(t) * 100) / 100;
		}
		preview();
	}

	function endBar(): void {
		drag = null;
	}

	// --- spinboxes -----------------------------------------------------------
	function commitNum(raw: string, which: 'inW' | 'inB' | 'outW' | 'outB'): void {
		const n = parseInt(raw, 10);
		if (!Number.isFinite(n)) return;
		if (which === 'inW') inWhite = Math.min(255, Math.max(1, Math.max(n, inBlack)));
		else if (which === 'inB') inBlack = Math.max(0, Math.min(254, Math.min(n, inWhite)));
		else if (which === 'outW') outWhite = Math.min(255, Math.max(0, Math.max(n, outBlack)));
		else outBlack = Math.max(0, Math.min(255, Math.min(n, outWhite)));
		preview();
	}

	function commitGamma(raw: string): void {
		const n = parseFloat(raw);
		if (!Number.isFinite(n)) return;
		gamma = Math.min(10, Math.max(0.1, Math.round(n * 100) / 100));
		preview();
	}

	// --- buttons ---------------------------------------------------------------
	function doAuto(): void {
		if (!histIn) return;
		const masks = [chR, chG, chB];
		let lo = 255;
		let hi = 0;
		for (let c = 0; c < 3; c++) {
			if (!masks[c]) continue;
			const bins = histIn[c];
			let tot = 0;
			for (let i = 0; i < 256; i++) tot += bins[i];
			if (!tot) continue;
			let acc = 0;
			let l = 0;
			for (let i = 0; i < 256; i++) {
				acc += bins[i];
				if (acc >= tot * 0.005) {
					l = i;
					break;
				}
			}
			acc = 0;
			let h = 255;
			for (let i = 255; i >= 0; i--) {
				acc += bins[i];
				if (acc >= tot * 0.005) {
					h = i;
					break;
				}
			}
			lo = Math.min(lo, l);
			hi = Math.max(hi, h);
		}
		if (hi > lo) {
			inBlack = lo;
			inWhite = hi;
		}
		gamma = 1;
		outBlack = 0;
		outWhite = 255;
		preview();
	}

	function doReset(): void {
		inBlack = 0;
		inWhite = 255;
		gamma = 1;
		outBlack = 0;
		outWhite = 255;
		chR = chG = chB = true;
		preview();
	}

	function apply(): void {
		if (!def) return;
		const r = getEditorRenderer();
		r.setActiveLayerFilterPreview(null);
		const settings = toSettings();
		if (def.isNoop?.(settings)) {
			closeDialog();
			return;
		}
		if (applyFilterSwap(r, 'Levels', () => def.filter(settings))) {
			saveSettings('effects.levels', settings);
			const snapshot = { ...settings };
			rememberLastApplied({
				menu: 'adjustments',
				name: 'Levels',
				apply: () => applyFilterSwap(getEditorRenderer(), 'Levels', () => def.filter(snapshot))
			});
			closeDialog();
		}
	}

	function cancel(): void {
		getEditorRenderer().setActiveLayerFilterPreview(null);
		closeDialog();
	}

	onMount(() => {
		computeHistogram();
		drawHist(inCanvas, histIn, 'left');
		preview();
		return () => getEditorRenderer().setActiveLayerFilterPreview(null);
	});
</script>

{#if def}
	<MovableDialog title="Levels Adjustment" onClose={cancel} width={680}>
		<div class="lv-main">
			<div class="lv-col">
				<canvas class="lv-hist" width={HIST_W} height={HIST_H} bind:this={inCanvas}></canvas>
			</div>

			<div class="lv-bargroup">
				<div class="lv-side">
					<span class="lv-ctl">
						<span class="lv-sw" style="background:{gray(inWhite)}" title="Input white point"></span>
						<input
							class="lv-num"
							type="number"
							min={0}
							max={255}
							step={1}
							value={inWhite}
							aria-label="Input white point"
							onchange={(e) => commitNum((e.currentTarget as HTMLInputElement).value, 'inW')}
						/>
					</span>
					<span class="lv-ctl">
						<span class="lv-sw" style="background:{gray(inBlack)}" title="Input black point"></span>
						<input
							class="lv-num"
							type="number"
							min={0}
							max={255}
							step={1}
							value={inBlack}
							aria-label="Input black point"
							onchange={(e) => commitNum((e.currentTarget as HTMLInputElement).value, 'inB')}
						/>
					</span>
				</div>
				<div
					class="lv-track"
					bind:this={inTrack}
					onpointerdown={(e) => beginBar(e, 'in', inTrack)}
					onpointermove={(e) => moveBar(e, inTrack)}
					onpointerup={endBar}
					onpointercancel={endBar}
				>
					<div class="lv-handle lv-left lv-white" style="top:{yOf(inWhite)}px"></div>
					<div class="lv-handle lv-left lv-black" style="top:{yOf(inBlack)}px"></div>
				</div>
			</div>

			<div class="lv-bargroup">
				<div
					class="lv-track"
					bind:this={outTrack}
					onpointerdown={(e) => beginBar(e, 'out', outTrack)}
					onpointermove={(e) => moveBar(e, outTrack)}
					onpointerup={endBar}
					onpointercancel={endBar}
				>
					<div class="lv-handle lv-right lv-white" style="top:{yOf(outWhite)}px"></div>
					<div class="lv-handle lv-right lv-gamma" style="top:{yOfGamma(gamma)}px"></div>
					<div class="lv-handle lv-right lv-black" style="top:{yOf(outBlack)}px"></div>
				</div>
				<div class="lv-side">
					<span class="lv-ctl">
						<input
							class="lv-num"
							type="number"
							min={0}
							max={255}
							step={1}
							value={outWhite}
							aria-label="Output white point"
							onchange={(e) => commitNum((e.currentTarget as HTMLInputElement).value, 'outW')}
						/>
						<span class="lv-sw" style="background:{gray(outWhite)}" title="Output white point"></span>
					</span>
					<span class="lv-ctl">
						<input
							class="lv-num lv-gamma"
							type="number"
							min={0.1}
							max={10}
							step={0.01}
							value={gamma.toFixed(2)}
							aria-label="Gamma"
							onchange={(e) => commitGamma((e.currentTarget as HTMLInputElement).value)}
						/>
						<span class="lv-sw" style="background:{gray(midGrayVal)}" title="Gamma midtone"></span>
					</span>
					<span class="lv-ctl">
						<input
							class="lv-num"
							type="number"
							min={0}
							max={255}
							step={1}
							value={outBlack}
							aria-label="Output black point"
							onchange={(e) => commitNum((e.currentTarget as HTMLInputElement).value, 'outB')}
						/>
						<span class="lv-sw" style="background:{gray(outBlack)}" title="Output black point"></span>
					</span>
				</div>
			</div>

			<div class="lv-col">
				<canvas class="lv-hist" width={HIST_W} height={HIST_H} bind:this={outCanvas}></canvas>
			</div>
		</div>

		<div class="lv-channels">
			<label class="lv-ch" style="color:#ef4444">
				<input type="checkbox" style="accent-color:#ef4444" bind:checked={chR} onchange={preview} />R
			</label>
			<label class="lv-ch" style="color:#22c55e">
				<input type="checkbox" style="accent-color:#22c55e" bind:checked={chG} onchange={preview} />G
			</label>
			<label class="lv-ch" style="color:#3b82f6">
				<input type="checkbox" style="accent-color:#3b82f6" bind:checked={chB} onchange={preview} />B
			</label>
		</div>

		{#snippet actions()}
			<div class="lv-actions">
				<button class="btn-secondary" onclick={doAuto}>Auto</button>
				<button class="btn-secondary" onclick={doReset}>Reset</button>
				<span class="lv-sp"></span>
				<button class="btn-primary" disabled={noop} onclick={apply}>OK</button>
				<button class="btn-secondary" onclick={cancel}>Cancel</button>
			</div>
		{/snippet}
	</MovableDialog>
{/if}