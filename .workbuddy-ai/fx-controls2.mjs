// Verify the new dials/pads:
//   Emboss / Relief / Bevel -> rotation dial; the dial must point at the LIGHT
//   Bulge / Warp / Smudge   -> XY pad for the focal point (image space, Y down)
//   Julia Fractal           -> XY pad for the complex-plane centre (no yDown,
//                              matching Mandelbrot's offset pad)
//   Drop Shadow             -> XY pad for the offset (image space, Y down)
//
// Lighting test: a square whose edges sit against a very different ground, so
// the response at each edge is fully saturated and the BRIGHTEST edge is the
// lit side. The sample band STRADDLES the edge (the response is centred on the
// boundary, not inside it).
//   Emboss/Relief on a white square over black (flat response = mid grey).
//   Bevel samples ALPHA, so it needs an alpha edge and a source that can be
//   brightened: a BLACK square on a TRANSPARENT ground. (On white the highlight
//   clamps to no-op; on black the shadow clamps, leaving only the lit edge.)
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const SQ = { x0: 400, y0: 250, x1: 800, y1: 550 }; // the test square, screen px
const ANGLES = [0, 90, 180, 270];
const DIRS = { 0: 'top', 90: 'right', 180: 'bottom', 270: 'left' };

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
// Wait for the app shell, then absorb any full-reload Vite has queued from
// recent source edits: without this the reload lands in the MIDDLE of the run
// and destroys the execution context.
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await sleep(450);
};
const pickTool = async (l) => {
	await page.evaluate((x) => document.querySelector(`button[aria-label="${x}"]`)?.click(), l);
	await sleep(300);
};
const openEffect = async (sub, leaf) => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
	});
	await sleep(280);
	await page.evaluate((s) => {
		[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes(s))?.click();
	}, sub);
	await sleep(320);
	const opened = await page.evaluate((l) => {
		const b = [...document.querySelectorAll('.sub-panel .menu-item')].find((x) => x.textContent.includes(l));
		if (!b) return null;
		b.click();
		return b.textContent.replace(/\s+/g, ' ').trim();
	}, leaf);
	await sleep(750);
	return opened;
};
const shape = () =>
	page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		if (!d) return null;
		return {
			hasPad: !!d.querySelector('.xyp-pad'),
			hasDial: !!d.querySelector('.ang-svg'),
			padLabel: d.querySelector('.xyp-label')?.textContent?.trim() ?? null,
			xyFields: [...d.querySelectorAll('.xyp-num')].map((i) => Number(i.value)),
			sliderLabels: [...d.querySelectorAll('.fsl-label')].map((s) => s.textContent.trim())
		};
	});
const closeDialog = async () => {
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(400);
};
const setDial = async (d) => {
	await page.evaluate((v) => {
		const el = document.querySelector('.m-dialog .ang-num');
		if (!el) return;
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
		el.dispatchEvent(new Event('input', { bubbles: true }));
		el.dispatchEvent(new Event('change', { bubbles: true }));
	}, d);
	await sleep(450);
};
const apply = async () => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'))?.click();
	});
	await sleep(1100);
};
const undo = async () => {
	await page.keyboard.down('Control');
	await page.keyboard.press('z');
	await page.keyboard.up('Control');
	await sleep(850);
};

// ---- document -------------------------------------------------------------
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);

const clip = await page.evaluate(() => {
	const r = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});
const SQ_C = {
	x0: SQ.x0 - clip.x,
	y0: SQ.y0 - clip.y,
	x1: SQ.x1 - clip.x,
	y1: SQ.y1 - clip.y
};

/** `button` picks the paint colour: 'left' = foreground (black), 'right' = background (white). */
const drawSquare = async (button) => {
	await pickTool('Rectangle Select');
	await page.mouse.move(SQ.x0, SQ.y0);
	await page.mouse.down();
	await page.mouse.move(SQ.x1, SQ.y1, { steps: 10 });
	await page.mouse.up();
	await sleep(320);
	await pickTool('Paint Bucket');
	await page.mouse.move((SQ.x0 + SQ.x1) / 2, (SQ.y0 + SQ.y1) / 2);
	await page.mouse.down({ button });
	await page.mouse.up({ button });
	await sleep(750);
	await page.keyboard.down('Control');
	await page.keyboard.press('d');
	await page.keyboard.up('Control');
	await sleep(400);
};

/**
 * Mean luminance of a band STRADDLING each edge of the square. `off` is the
 * offset of the band's first row/column relative to the edge (negative = outside
 * the square), `w` its thickness. The emboss/bevel response is centred on the
 * boundary, so the band must not sit wholly inside or outside.
 */
const edgeLums = async (tag, off = -2, w = 5) => {
	const buf = await page.screenshot({ clip });
	if (tag) await page.screenshot({ path: `${OUT}light-${tag}.png`, clip });
	return page.evaluate(
		async (arg) => {
			const img = new Image();
			img.src = 'data:image/png;base64,' + arg.data;
			await img.decode();
			const c = document.createElement('canvas');
			c.width = img.width;
			c.height = img.height;
			const ctx = c.getContext('2d');
			ctx.drawImage(img, 0, 0);
			const px = ctx.getImageData(0, 0, c.width, c.height).data;
			const lum = (x, y) => {
				const i = (y * c.width + x) * 4;
				return (px[i] + px[i + 1] + px[i + 2]) / 3;
			};
			const band = (x0, y0, x1, y1) => {
				let s = 0,
					n = 0;
				for (let y = Math.max(0, y0); y < Math.min(c.height, y1); y++)
					for (let x = Math.max(0, x0); x < Math.min(c.width, x1); x++) {
						s += lum(x, y);
						n++;
					}
				return n ? s / n : 0;
			};
			const s = arg.sq;
			const o = arg.off;
			const w = arg.w;
			const mx = Math.round((s.x0 + s.x1) / 2);
			const my = Math.round((s.y0 + s.y1) / 2);
			const hw = Math.round((s.x1 - s.x0) / 4);
			const hh = Math.round((s.y1 - s.y0) / 4);
			return {
				top: band(mx - hw, s.y0 + o, mx + hw, s.y0 + o + w),
				bottom: band(mx - hw, s.y1 - o - w, mx + hw, s.y1 - o),
				left: band(s.x0 + o, my - hh, s.x0 + o + w, my + hh),
				right: band(s.x1 - o - w, my - hh, s.x1 - o, my + hh)
			};
		},
		{ data: buf.toString('base64'), sq: SQ_C, off, w }
	);
};
const brightest = (l) => Object.entries(l).sort((a, b) => b[1] - a[1])[0][0];

// ---- 1. dialog shapes -----------------------------------------------------
const shapes = [];
for (const [sub, leaf] of [
	['Distort', 'Bulge'],
	['Distort', 'Warp'],
	['Distort', 'Smudge'],
	['Render', 'Julia Fractal'],
	['Object', 'Drop Shadow'],
	['Stylize', 'Emboss'],
	['Stylize', 'Relief'],
	['Object', 'Bevel']
]) {
	const opened = await openEffect(sub, leaf);
	shapes.push({ leaf, opened, shape: await shape() });
	await closeDialog();
}

// ---- 2. pad edges ---------------------------------------------------------
const padEdges = {};
for (const [sub, leaf] of [
	['Distort', 'Bulge'],
	['Distort', 'Warp'],
	['Distort', 'Smudge'],
	['Render', 'Julia Fractal'],
	['Render', 'Mandelbrot Fractal'],
	['Object', 'Drop Shadow']
]) {
	await openEffect(sub, leaf);
	const pad = await page.evaluate(() => {
		const b = document.querySelector('.xyp-pad').getBoundingClientRect();
		return { x: b.x, y: b.y, w: b.width, h: b.height };
	});
	const drag = async (dx, dy) => {
		await page.mouse.move(pad.x + dx, pad.y + dy);
		await page.mouse.down();
		await page.mouse.move(pad.x + dx, pad.y + dy, { steps: 4 });
		await page.mouse.up();
		await sleep(320);
	};
	await drag(3, pad.h / 2);
	const left = (await shape()).xyFields;
	await drag(pad.w - 3, pad.h / 2);
	const right = (await shape()).xyFields;
	await drag(pad.w / 2, 3);
	const top = (await shape()).xyFields;
	await drag(pad.w / 2, pad.h - 3);
	const bottom = (await shape()).xyFields;
	padEdges[leaf] = { left, right, top, bottom };
	await closeDialog();
}

// ---- 3. lighting direction -----------------------------------------------
// Bevel: a BLACK square on a TRANSPARENT ground — only the lit edge lights up.
// (On an opaque ground there is no alpha edge at all, so the bevel is a no-op.)
await drawSquare('left');
const light = { Bevel: [] };
const defaults = [];
/**
 * Observe the SHIPPED default: the dialog remembers the last-used settings, so
 * the persisted block has to be dropped first, otherwise this reads whatever
 * the previous section left behind.
 */
const clearFxSettings = async (id) => {
	await page.evaluate((k) => {
		const KEY = 'paint.svelte.settings.v1';
		try {
			const s = JSON.parse(localStorage.getItem(KEY) ?? '{}');
			delete s[k];
			localStorage.setItem(KEY, JSON.stringify(s));
		} catch {
			/* ignore */
		}
	}, `effects.${id}`);
};
const checkDefault = async (leaf, id, wantLit, sub) => {
	await clearFxSettings(id);
	await openEffect(sub, leaf);
	const dial = await page.evaluate(() => Number(document.querySelector('.m-dialog .ang-num')?.value));
	await apply();
	const lums = await edgeLums(`default-${leaf.toLowerCase()}`);
	defaults.push({ leaf, dial, lums, wantLit });
	await undo();
};
for (const D of ANGLES) {
	await openEffect('Object', 'Bevel');
	await setDial(D);
	await apply();
	const lums = await edgeLums(`bevel-${D}`);
	light.Bevel.push({ D, lums, pick: brightest(lums) });
	await undo();
}
// The defaults were re-picked so the default RENDERING is unchanged; verify the
// lit quadrant at the default.
await checkDefault('Bevel', 'bevel', ['top', 'right'], 'Object'); // was 135 -> light from the upper right

// Emboss / Relief: a WHITE square on a BLACK ground (flat response = mid grey,
// edges saturate to black/white).
await pickTool('Paint Bucket');
await page.mouse.move(650, 450);
await page.mouse.down(); // foreground -> black, floods the layer
await page.mouse.up();
await sleep(800);
await drawSquare('right');
for (const leaf of ['Emboss', 'Relief']) {
	light[leaf] = [];
	for (const D of ANGLES) {
		await openEffect('Stylize', leaf);
		await setDial(D);
		await apply();
		const lums = await edgeLums(`${leaf.toLowerCase()}-${D}`);
		light[leaf].push({ D, lums, pick: brightest(lums) });
		await undo();
	}
}
await checkDefault('Emboss', 'emboss', ['top', 'left'], 'Stylize'); // was 45 -> light from the upper left
await checkDefault('Relief', 'relief', ['bottom', 'right'], 'Stylize'); // was 45 -> light from the lower right

await browser.close();

// ---- report --------------------------------------------------------------
console.log('--- dialog shapes ---');
for (const r of shapes) {
	const s = r.shape;
	console.log(
		`${r.leaf.padEnd(14)} opened=${String(r.opened).padEnd(18)} pad=${s?.hasPad} dial=${s?.hasDial} padLabel=${s?.padLabel} ` +
			`xy=[${s?.xyFields}] sliders=[${s?.sliderLabels.join(', ')}]`
	);
}
console.log('\n--- pad edges (left / right / top / bottom) ---');
for (const [leaf, e] of Object.entries(padEdges)) {
	console.log(`${leaf.padEnd(19)} L=[${e.left}] R=[${e.right}] T=[${e.top}] B=[${e.bottom}]`);
}
console.log('\n--- lighting direction ---');
for (const [leaf, rows] of Object.entries(light)) {
	for (const r of rows) {
		const l = r.lums;
		console.log(
			`${leaf.padEnd(7)} dial ${String(r.D).padStart(3)}  ` +
				`top=${l.top.toFixed(1).padStart(6)} right=${l.right.toFixed(1).padStart(6)} ` +
				`bottom=${l.bottom.toFixed(1).padStart(6)} left=${l.left.toFixed(1).padStart(6)}  -> lit edge: ${r.pick}`
		);
	}
}

const byLeaf = Object.fromEntries(shapes.map((r) => [r.leaf, r.shape]));
const noCenterSliders = (s) => !s?.sliderLabels.some((l) => /^(Center|Offset)\s*[XY]$/i.test(l));
const lightChecks = [];
for (const [leaf, rows] of Object.entries(light)) {
	for (const r of rows) {
		lightChecks.push([`${leaf} dial ${String(r.D).padStart(3)} -> lit edge = ${DIRS[r.D]}`, r.pick === DIRS[r.D]]);
	}
}
const padY = (leaf) => {
	const e = padEdges[leaf];
	return { topY: e.top[1], bottomY: e.bottom[1], leftX: e.left[0], rightX: e.right[0] };
};

console.log('\n--- defaults (dial value as opened, and which quadrant is lit) ---');
const defaultChecks = [];
for (const d of defaults) {
	const l = d.lums;
	const lit = d.wantLit;
	const unlit = ['top', 'right', 'bottom', 'left'].filter((e) => !lit.includes(e));
	const litMean = lit.reduce((s, e) => s + l[e], 0) / lit.length;
	const unlitMean = unlit.reduce((s, e) => s + l[e], 0) / unlit.length;
	// Scale-free: the three effects have wildly different contrast (Emboss
	// saturates, Bevel only nudges a few levels), so compare the margin with the
	// effect's own dynamic range across the four edges.
	const range = Math.max(...Object.values(l)) - Math.min(...Object.values(l));
	const margin = litMean - unlitMean;
	console.log(
		`${d.leaf.padEnd(7)} dial=${String(d.dial).padStart(3)}  lit(${lit.join('+')})=${litMean.toFixed(1)}  ` +
			`unlit(${unlit.join('+')})=${unlitMean.toFixed(1)}  margin=${margin.toFixed(1)} of range ${range.toFixed(1)}  ` +
			`-> light from the ${d.wantLit.join('-')}`
	);
	defaultChecks.push([
		`${d.leaf} default (${d.dial}) still lights from the ${d.wantLit.join('-')}`,
		margin > 0.15 * range
	]);
}

const checks = [
	['Bulge uses an XY pad, no Center X/Y sliders', !!byLeaf['Bulge']?.hasPad && noCenterSliders(byLeaf['Bulge'])],
	['Warp uses an XY pad, no Center X/Y sliders', !!byLeaf['Warp']?.hasPad && noCenterSliders(byLeaf['Warp'])],
	['Smudge uses an XY pad, no Center X/Y sliders', !!byLeaf['Smudge']?.hasPad && noCenterSliders(byLeaf['Smudge'])],
	['Julia Fractal uses an XY pad, no Center X/Y sliders', !!byLeaf['Julia Fractal']?.hasPad && noCenterSliders(byLeaf['Julia Fractal'])],
	['Drop Shadow uses an XY pad, no Offset X/Y sliders', !!byLeaf['Drop Shadow']?.hasPad && noCenterSliders(byLeaf['Drop Shadow'])],
	['Emboss shows a rotation dial', !!byLeaf['Emboss']?.hasDial],
	['Relief shows a rotation dial', !!byLeaf['Relief']?.hasDial],
	['Bevel shows a rotation dial', !!byLeaf['Bevel']?.hasDial],
	[
		'no Angle slider left in Emboss/Relief',
		!byLeaf['Emboss']?.sliderLabels.some((l) => /angle/i.test(l)) &&
			!byLeaf['Relief']?.sliderLabels.some((l) => /angle/i.test(l))
	],
	// yDown pads: the top of the pad is the TOP of the picture (minY)
	['Bulge pad: top edge = minY, bottom = maxY', padY('Bulge').topY <= 5 && padY('Bulge').bottomY >= 95],
	['Warp pad: top edge = minY, bottom = maxY', padY('Warp').topY <= 5 && padY('Warp').bottomY >= 95],
	['Smudge pad: top edge = minY, bottom = maxY', padY('Smudge').topY <= 5 && padY('Smudge').bottomY >= 95],
	['Drop Shadow pad: top edge = minY, bottom = maxY', padY('Drop Shadow').topY <= -45 && padY('Drop Shadow').bottomY >= 45],
	['Bulge pad X spans 0..100', padY('Bulge').leftX <= 5 && padY('Bulge').rightX >= 95],
	// fractal pads: no yDown, so the top of the pad is maxY — same as Mandelbrot
	['Julia pad: top edge = maxY (no yDown)', padY('Julia Fractal').topY >= 90 && padY('Julia Fractal').bottomY <= -90],
	['Mandelbrot pad: top edge = maxY (reference)', padY('Mandelbrot Fractal').topY >= 1.5],
	['Julia + Mandelbrot pads agree on the Y direction', padY('Julia Fractal').topY > 0 === padY('Mandelbrot Fractal').topY > 0],
	...lightChecks,
	...defaultChecks
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`\nerrors : ${errors.length ? errors.join(' | ') : 'none'}`);
