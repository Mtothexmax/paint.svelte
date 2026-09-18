// Verify the new `kind: 'select'` param widget, using Motion Blur's "Edge
// Behavior" as the subject (it was the only enumeration still drawn as a
// slider, with the options spelled out in its label).
//
// Checks:
//   1. the dialog renders a <select> with the four named options
//   2. no slider whose label spells out "0:Clamp, ..." survives
//   3. choosing an option writes a NUMBER into settings (not the string)
//   4. the reset button restores the default
//   5. the choice actually changes the render — content sits at the left edge
//      of the canvas and a long horizontal streak reaches out of bounds, so
//      Clamp (repeat the edge) and Transparent (drop out-of-range samples)
//      must disagree
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

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
	await page.evaluate((l) => {
		[...document.querySelectorAll('.sub-panel .menu-item')].find((x) => x.textContent.includes(l))?.click();
	}, leaf);
	for (let i = 0; i < 40; i++) {
		if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) break;
		await sleep(150);
	}
	await sleep(400);
};
const apply = async () => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'))?.click();
	});
	await sleep(1200);
};
const undo = async () => {
	await page.keyboard.down('Control');
	await page.keyboard.press('z');
	await page.keyboard.up('Control');
	await sleep(850);
};
const setDial = async (d) => {
	await page.evaluate((v) => {
		const el = document.querySelector('.m-dialog .ang-num');
		if (!el) return;
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
		el.dispatchEvent(new Event('input', { bubbles: true }));
		el.dispatchEvent(new Event('change', { bubbles: true }));
	}, d);
	await sleep(400);
};
/** Set the Nth slider in the dialog (Motion Blur has only Distance). */
const setSlider = async (index, value) => {
	await page.evaluate(
		(arg) => {
			const el = [...document.querySelectorAll('.m-dialog .fsl-range')][arg.i];
			if (!el) return;
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(arg.v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		},
		{ i: index, v: value }
	);
	await sleep(350);
};
/** Choose an option by its visible label; returns the raw <select> value. */
const chooseOption = async (label) => {
	const raw = await page.evaluate((l) => {
		const sel = document.querySelector('.m-dialog .fsel-input');
		if (!sel) return null;
		const opt = [...sel.options].find((o) => o.textContent.trim() === l);
		if (!opt) return null;
		sel.value = opt.value;
		sel.dispatchEvent(new Event('change', { bubbles: true }));
		return sel.value;
	}, label);
	await sleep(400);
	return raw;
};
const meanLum = async (region) => {
	const clip = await page.evaluate(() => {
		const b = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
		return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
	});
	const box = region
		? {
				x: clip.x + region.x0,
				y: clip.y + region.y0,
				width: region.x1 - region.x0,
				height: region.y1 - region.y0
			}
		: clip;
	const buf = await page.screenshot({ clip: box });
	return page.evaluate(async (data) => {
		const img = new Image();
		img.src = 'data:image/png;base64,' + data;
		await img.decode();
		const c = document.createElement('canvas');
		c.width = img.width;
		c.height = img.height;
		const ctx = c.getContext('2d');
		ctx.drawImage(img, 0, 0);
		const px = ctx.getImageData(0, 0, c.width, c.height).data;
		let s = 0;
		for (let i = 0; i < px.length; i += 4) s += (px[i] + px[i + 1] + px[i + 2]) / 3;
		return s / (px.length / 4);
	}, buf.toString('base64'));
};

// ---- document -------------------------------------------------------------
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);
const clip = await page.evaluate(() => {
	const b = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
});

// NOTE: the content must reach the image boundary for the edge modes to differ.
// An earlier attempt drew a block flush against the left edge, but a Rectangle
// Select drag started exactly on the canvas corner is rejected by the app, so
// nothing was drawn (the "in-block" strip then read the same as bare canvas).
// Section 4 below instead floods the whole layer, which needs no geometry.
const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

// ---- 1. the widget --------------------------------------------------------
await openEffect('Blurs', 'Motion Blur');
const ui = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return null;
	const sel = d.querySelector('.fsel-input');
	return {
		hasSelect: !!sel,
		selectCount: d.querySelectorAll('.fsel-input').length,
		optionLabels: sel ? [...sel.options].map((o) => o.textContent.trim()) : [],
		optionValues: sel ? [...sel.options].map((o) => o.value) : [],
		selected: sel ? sel.value : null,
		sliderLabels: [...d.querySelectorAll('.fsl-label')].map((s) => s.textContent.trim()),
		selectLabel: d.querySelector('.fsel-label')?.textContent?.trim() ?? null,
		resetDisabled: d.querySelector('.fsel-reset')?.disabled ?? null
	};
});
check('Motion Blur dialog opened', !!ui);
check('renders exactly one <select>', ui?.selectCount === 1, `count=${ui?.selectCount}`);
check(
	'the select is labelled "Edge Behavior" (no spelled-out options)',
	ui?.selectLabel === 'Edge Behavior',
	`label="${ui?.selectLabel}"`
);
check(
	'four named options in order',
	ui?.optionLabels.join('|') === 'Clamp|Wrap|Mirror|Transparent',
	`options=[${ui?.optionLabels?.join(', ')}]`
);
check(
	'no slider still spells its options out',
	!(ui?.sliderLabels ?? []).some((l) => l.includes(':') || l.includes('0:')),
	`sliders=[${ui?.sliderLabels?.join(', ')}]`
);
check('defaults to Clamp', ui?.selected === '0', `selected=${ui?.selected}`);
check('reset is disabled at the default', ui?.resetDisabled === true, `disabled=${ui?.resetDisabled}`);

// ---- 2. choosing an option ------------------------------------------------
const rawMirror = await chooseOption('Mirror');
const afterPick = await page.evaluate(() => {
	const sel = document.querySelector('.m-dialog .fsel-input');
	return { value: sel?.value, resetDisabled: document.querySelector('.fsel-reset')?.disabled };
});
check('choosing Mirror sets the value to 2', afterPick.value === '2', `value=${afterPick.value} (raw="${rawMirror}")`);
check('reset becomes enabled once off-default', afterPick.resetDisabled === false, `disabled=${afterPick.resetDisabled}`);

// reset restores the default
await page.evaluate(() => document.querySelector('.m-dialog .fsel-reset')?.click());
await sleep(350);
const afterReset = await page.evaluate(() => document.querySelector('.m-dialog .fsel-input')?.value);
check('reset restores Clamp', afterReset === '0', `value=${afterReset}`);

// ---- 3. the setting round-trips as a NUMBER ------------------------------
await chooseOption('Transparent');
await apply();
const persisted = await page.evaluate(() => {
	const s = JSON.parse(localStorage.getItem('paint.svelte.settings.v1') ?? '{}');
	const v = s['effects.motionBlur']?.edgeBehavior;
	return { value: v, type: typeof v };
});
check(
	'edgeBehavior persists as a number, not a string',
	persisted.type === 'number' && persisted.value === 3,
	`value=${JSON.stringify(persisted.value)} type=${persisted.type}`
);
await undo();

// Flood the WHOLE layer black — no selection, so the bucket fills the layer.
// This makes the edge mode separable without having to place content exactly on
// the boundary: with an all-black image every mode that samples *somewhere*
// inside the image (Clamp/Wrap/Mirror) still yields black, whereas Transparent
// drops the out-of-range samples and so leaves the borders partly transparent.
await pickTool('Paint Bucket');
await page.mouse.move(clip.x + Math.round(clip.width / 2), clip.y + Math.round(clip.height / 2));
await page.mouse.down();
await page.mouse.up();
await sleep(800);
const baseline = await meanLum();

// ---- 4. the choice changes the render ------------------------------------
// NOTE: a blur is a local average, so it PRESERVES the mean of the whole
// canvas. That is fine here because the modes differ in what they do *outside*
// the image, which is exactly what breaks the conservation at the borders.
const modes = ['Clamp', 'Wrap', 'Mirror', 'Transparent'];
const means = {};
const shots = {};
const applied = {};
for (const m of modes) {
	await openEffect('Blurs', 'Motion Blur');
	await setDial(90); // horizontal streak
	await setSlider(0, 200); // long enough to reach out of bounds
	await chooseOption(m);
	applied[m] = await page.evaluate(() => ({
		dial: Number(document.querySelector('.m-dialog .ang-num')?.value),
		distance: Number(document.querySelector('.m-dialog .fsl-range')?.value),
		mode: document.querySelector('.m-dialog .fsel-input')?.value
	}));
	await apply();
	means[m] = await meanLum();
	shots[m] = (await page.screenshot({ clip })).toString('base64');
	await undo();
}

// A whole-canvas mean barely moves (the effect only touches a thin border band,
// and the canvas is scaled up from the 800x600 document). Diff the frames
// instead — that is geometry-free and shows WHERE the modes disagree.
const diff = await page.evaluate(
	async (arg) => {
		const load = async (b64) => {
			const img = new Image();
			img.src = 'data:image/png;base64,' + b64;
			await img.decode();
			const c = document.createElement('canvas');
			c.width = img.width;
			c.height = img.height;
			const ctx = c.getContext('2d');
			ctx.drawImage(img, 0, 0);
			return { d: ctx.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
		};
		const A = await load(arg.a);
		// Locate the document inside the canvas host: the flooded layer is black,
		// the app background around it is grey. The first mostly-dark column is
		// the document's left edge (empirically x~137 of the 1078px host).
		const colMean = [];
		for (let x = 0; x < A.w; x++) {
			let s = 0;
			for (let y = 0; y < A.h; y++) {
				const i = (y * A.w + x) * 4;
				s += (A.d[i] + A.d[i + 1] + A.d[i + 2]) / 3;
			}
			colMean.push(s / A.h);
		}
		const docLeft = colMean.findIndex((v) => v < 12);
		const out = {};
		for (const [name, b64] of Object.entries(arg.others)) {
			const B = await load(b64);
			let n = 0;
			let minX = Infinity;
			let maxX = -1;
			for (let i = 0; i < A.d.length; i += 4) {
				const dd =
					Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]);
				if (dd > 20) {
					n++;
					const x = (i / 4) % A.w;
					if (x < minX) minX = x;
					if (x > maxX) maxX = x;
				}
			}
			out[name] = { n, minX: n ? minX : null, maxX: n ? maxX : null, w: A.w, docLeft };
		}
		return out;
	},
	{ a: shots.Clamp, others: { Wrap: shots.Wrap, Mirror: shots.Mirror, Transparent: shots.Transparent } }
);

check('the layer really was flooded black', baseline < 5, `baseline=${baseline.toFixed(2)}`);
check(
	'the effect was actually applied with the right settings',
	modes.every((m) => applied[m].distance === 200 && applied[m].dial === 90),
	`${applied.Clamp.distance}px @ ${applied.Clamp.dial}deg, mode=${applied.Clamp.mode}`
);
check(
	'the four edge modes do not all render alike',
	new Set(modes.map((m) => means[m].toFixed(2))).size >= 2,
	modes.map((m) => `${m}=${means[m].toFixed(2)}`).join(' ')
);
check(
	'Clamp and Mirror render identically (repeatable)',
	diff.Mirror.n === 0,
	`differing pixels=${diff.Mirror.n}`
);
check(
	'Transparent differs from Clamp in the border band',
	diff.Transparent.n > 500,
	`differing pixels=${diff.Transparent.n} of ${clip.width * clip.height}`
);
check(
	'those differences sit at the image edge (where the streak leaves)',
	diff.Transparent.minX !== null && Math.abs(diff.Transparent.minX - diff.Transparent.docLeft) <= 4,
	`band starts x=${diff.Transparent.minX}, document left edge x=${diff.Transparent.docLeft}`
);
check(
	'and they form a narrow border band, not a global change',
	diff.Transparent.maxX - diff.Transparent.minX < 200,
	`band width=${diff.Transparent.maxX - diff.Transparent.minX}px of ${diff.Transparent.w}`
);
check(
	'Wrap differs from Clamp too',
	diff.Wrap.n > 500,
	`differing pixels=${diff.Wrap.n}`
);
check('no console errors', errors.length === 0, errors.slice(0, 3).join(' / '));

await browser.close();

console.log('--- Motion Blur Edge Behavior (kind: select) ---');
console.log(`select label  : ${ui?.selectLabel}`);
console.log(`options       : [${ui?.optionLabels?.join(', ')}]  values=[${ui?.optionValues?.join(', ')}]`);
console.log(`sliders left  : [${ui?.sliderLabels?.join(', ')}]`);
console.log(`canvas clip   : ${clip.width}x${clip.height}   black flood mean=${baseline.toFixed(2)}`);
console.log(`canvas means  : ${modes.map((m) => `${m}=${means[m].toFixed(2)}`).join('  ')}`);
console.log(
	`vs Clamp      : ${Object.entries(diff)
		.map(([k, v]) => `${k}: ${v.n}px @x${v.minX}..${v.maxX}`)
		.join('  ')}`
);
console.log('');
let fails = 0;
for (const r of results) {
	if (!r.ok) fails++;
	console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`);
}
console.log(`\n${results.length - fails}/${results.length} passed   errors : ${errors.length ? errors.length : 'none'}`);
process.exit(fails ? 1 : 0);
