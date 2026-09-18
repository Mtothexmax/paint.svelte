// Verify that Object > Drop Shadow now uses a single `kind: 'color'` row
// instead of three Red/Green/Blue sliders — and that the row is actually wired
// to the render.
//
// Method: draw a black square on a transparent ground, push the offset pad to
// the bottom-right so a wide shadow band appears below/right of the square,
// then apply the effect twice:
//   (1) untouched default  -> the shadow colour is black  (0x000000)
//   (2) after clicking "Choose background color" -> white (0xffffff)
// The band's mean luminance must jump between the two runs. That proves the
// colour value flows into the shader, not merely that a widget exists.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const SQ = { x0: 400, y0: 250, x1: 800, y1: 550 };

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
// Wait for the app shell (the menubar) rather than a fixed delay: a cold Vite
// build can take several seconds.
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
// Absorb any full-reload Vite has queued from recent source edits: without
// this the reload lands in the MIDDLE of the run and destroys the execution
// context ("Execution context was destroyed ... navigation").
await new Promise((r) => setTimeout(r, 2500));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

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
	// Poll for the dialog: the effect bundle is lazy, so it can take a moment.
	for (let i = 0; i < 40; i++) {
		if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) break;
		await sleep(150);
	}
	await sleep(400);
	return opened;
};
const closeDialog = async () => {
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(400);
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
// Wait for hydration before driving the UI: after a source edit Vite is still
// rebuilding, and a click that lands too early is silently swallowed.
await page.waitForFunction(
	() => [...document.querySelectorAll('button')].some((b) => (b.textContent ?? '').includes('New…')),
	{ timeout: 30000 }
);
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);

/** The canvas host; polls because the export can lag behind the dialog closing. */
const canvasClip = async () => {
	for (let i = 0; i < 40; i++) {
		const r = await page.evaluate(() => {
			const el = document.querySelector('div[style*="touch-action"]');
			if (!el) return null;
			const b = el.getBoundingClientRect();
			if (b.width < 10 || b.height < 10) return null;
			return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
		});
		if (r) return r;
		await sleep(250);
	}
	throw new Error('canvas never appeared');
};
const clip = await canvasClip();
const SQ_C = {
	x0: SQ.x0 - clip.x,
	y0: SQ.y0 - clip.y,
	x1: SQ.x1 - clip.x,
	y1: SQ.y1 - clip.y
};

// A black square on a transparent ground (foreground = black).
await pickTool('Rectangle Select');
await page.mouse.move(SQ.x0, SQ.y0);
await page.mouse.down();
await page.mouse.move(SQ.x1, SQ.y1, { steps: 10 });
await page.mouse.up();
await sleep(320);
await pickTool('Paint Bucket');
await page.mouse.move((SQ.x0 + SQ.x1) / 2, (SQ.y0 + SQ.y1) / 2);
await page.mouse.down();
await page.mouse.up();
await sleep(750);
await page.keyboard.down('Control');
await page.keyboard.press('d');
await page.keyboard.up('Control');
await sleep(400);

/** Mean luminance of the shadow band just below the square. */
const shadowBand = async (tag) => {
	const buf = await page.screenshot({ clip });
	if (tag) await page.screenshot({ path: `${OUT}shadow-${tag}.png`, clip });
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
			const s = arg.sq;
			const mx = Math.round((s.x0 + s.x1) / 2);
			const hw = Math.round((s.x1 - s.x0) / 4);
			// A 30px-tall strip 10px below the square: inside the offset shadow
			// but well clear of the square itself.
			let sum = 0,
				n = 0;
			for (let y = s.y1 + 10; y < Math.min(c.height, s.y1 + 40); y++)
				for (let x = mx - hw; x < mx + hw; x++) {
					const i = (y * c.width + x) * 4;
					sum += (px[i] + px[i + 1] + px[i + 2]) / 3;
					n++;
				}
			return n ? sum / n : NaN;
		},
		{ data: buf.toString('base64'), sq: SQ_C }
	);
};

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

// ---- 1. the dialog exposes ONE colour row, no R/G/B sliders --------------
await openEffect('Object', 'Drop Shadow');
const ui = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return null;
	return {
		colorRows: [...d.querySelectorAll('.fcol')].map((r) => ({
			label: r.querySelector('.fcol-label')?.textContent?.trim(),
			swatch: getComputedStyle(r.querySelector('.fcol-stored')).backgroundColor,
			buttons: [...r.querySelectorAll('.fcol-btn')].map((b) => b.title)
		})),
		sliderLabels: [...d.querySelectorAll('.fsl-label')].map((s) => s.textContent.trim())
	};
});
check('Drop Shadow dialog opened', !!ui, JSON.stringify(ui?.sliderLabels));
check('exactly one colour row', ui?.colorRows.length === 1, `count=${ui?.colorRows.length}`);
check('the row is labelled "Color"', ui?.colorRows[0]?.label === 'Color', `label=${ui?.colorRows[0]?.label}`);
check(
	'row offers foreground + background buttons',
	ui?.colorRows[0]?.buttons.length === 2,
	`buttons=[${ui?.colorRows[0]?.buttons?.join(' | ')}]`
);
const hasRGB = (ui?.sliderLabels ?? []).some((l) => ['Red', 'Green', 'Blue'].includes(l));
check('no Red/Green/Blue sliders remain', !hasRGB, `sliders=[${ui?.sliderLabels?.join(', ')}]`);
check(
	'stored swatch shows the default black',
	ui?.colorRows[0]?.swatch === 'rgb(0, 0, 0)',
	`swatch=${ui?.colorRows[0]?.swatch}`
);

// Push the offset pad to the bottom-right so the shadow band is wide.
const pad = await page.evaluate(() => {
	const b = document.querySelector('.xyp-pad').getBoundingClientRect();
	return { x: b.x, y: b.y, w: b.width, h: b.height };
});
await page.mouse.move(pad.x + pad.w - 3, pad.y + pad.h - 3);
await page.mouse.down();
await page.mouse.move(pad.x + pad.w - 3, pad.y + pad.h - 3, { steps: 4 });
await page.mouse.up();
await sleep(320);
const offsetXY = await page.evaluate(() =>
	[...document.querySelectorAll('.m-dialog .xyp-num')].map((i) => Number(i.value))
);
// The pad maps -50..+50 across its width, so a press 3px inside the right/bottom
// edge lands at ~48, not exactly 50. What matters is that it reaches the far end.
check('offset pad reaches the bottom-right', offsetXY[0] >= 45 && offsetXY[1] >= 45, `xy=[${offsetXY}]`);

// ---- 2. default (black) shadow -------------------------------------------
await apply();
const lumBlack = await shadowBand('black');
await undo();

// ---- 3. white shadow via the colour row ----------------------------------
await openEffect('Object', 'Drop Shadow');
const clicked = await page.evaluate(() => {
	const row = document.querySelector('.m-dialog .fcol');
	const btn = [...row.querySelectorAll('.fcol-btn')].find((b) => /background/i.test(b.title));
	if (!btn) return null;
	btn.click();
	return btn.title;
});
await sleep(500);
const swatchAfter = await page.evaluate(() =>
	getComputedStyle(document.querySelector('.m-dialog .fcol-stored')).backgroundColor
);
check('"Choose background color" button exists', !!clicked, `title=${clicked}`);
check('clicking it repaints the stored swatch white', swatchAfter === 'rgb(255, 255, 255)', `swatch=${swatchAfter}`);

// re-push the pad (the dialog reloads the persisted offset, which is 50/50 now)
await page.evaluate(() => {
	const els = [...document.querySelectorAll('.m-dialog .xyp-num')];
	if (els[0]?.value !== '50') {
		for (const [i, v] of [
			[0, '50'],
			[1, '50']
		]) {
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(els[i], v);
			els[i].dispatchEvent(new Event('input', { bubbles: true }));
			els[i].dispatchEvent(new Event('change', { bubbles: true }));
		}
	}
});
await sleep(300);
await apply();
const lumWhite = await shadowBand('white');
await undo();

check(
	'the shadow band brightens when the colour turns white',
	Number.isFinite(lumBlack) && Number.isFinite(lumWhite) && lumWhite - lumBlack > 100,
	`black=${lumBlack?.toFixed(1)} white=${lumWhite?.toFixed(1)} delta=${(lumWhite - lumBlack)?.toFixed(1)}`
);
// The regression that mattered: a white shadow at the default opacity of 128
// must be TRANSLUCENT. Emitting a non-premultiplied colour (rgb unscaled by
// alpha) made it composite as an opaque slab and read 255 here. Expected is
// 0.502*255 + 0.498*backdrop(~17) ~= 136.
check(
	'the white shadow stays translucent (premultiplied alpha)',
	Number.isFinite(lumWhite) && lumWhite > 105 && lumWhite < 185,
	`white=${lumWhite?.toFixed(1)} (expected ~136; 255 == opaque, non-premultiplied)`
);
check('no console errors', errors.length === 0, errors.slice(0, 3).join(' / '));

await browser.close();

// ---- report --------------------------------------------------------------
console.log('--- Drop Shadow colour row ---');
console.log(
	`colorRows=${ui?.colorRows.length} label=${ui?.colorRows[0]?.label} buttons=[${ui?.colorRows[0]?.buttons?.join(' | ')}]`
);
console.log(`sliders=[${ui?.sliderLabels?.join(', ')}]  swatch=${ui?.colorRows[0]?.swatch}`);
console.log(`shadow band luminance: black=${lumBlack?.toFixed(1)}  white=${lumWhite?.toFixed(1)}`);
console.log('');
let fails = 0;
for (const r of results) {
	if (!r.ok) fails++;
	console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`);
}
console.log(`\n${results.length - fails}/${results.length} passed   errors : ${errors.length ? errors.length : 'none'}`);
process.exit(fails ? 1 : 0);
