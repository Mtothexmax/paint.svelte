// Verify the premultiplied-alpha fix in Object > Outline.
//
// Outline paints a constant stroke colour with a variable alpha (Intensity).
// Emitting rgb unscaled by alpha made a half-intensity stroke composite as if
// opaque, so lowering Intensity barely changed anything. At Intensity 255 the
// fix is a no-op (alpha 1), so the two runs must now differ markedly.
//
// Geometry-free method: compare the mean luminance of the WHOLE canvas between
// Intensity 255 and Intensity 128. Only the stroke pixels change, so a
// correctly premultiplied stroke must darken the canvas measurably.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

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
		const b = [...document.querySelectorAll('.sub-panel .menu-item')].find((x) => x.textContent.includes(l));
		b?.click();
	}, leaf);
	for (let i = 0; i < 40; i++) {
		if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) break;
		await sleep(150);
	}
	await sleep(400);
};
const closeDialog = async () => {
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
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
/** Set the Nth slider in the dialog. Outline's order is [Width, Intensity]. */
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
const sliderValues = () =>
	page.evaluate(() => [...document.querySelectorAll('.m-dialog .fsl-range')].map((e) => Number(e.value)));
/** Mean luminance of the whole canvas. */
const canvasMean = async () => {
	const clip = await page.evaluate(() => {
		const el = document.querySelector('div[style*="touch-action"]');
		const b = el.getBoundingClientRect();
		return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
	});
	const buf = await page.screenshot({ clip });
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

// ---- document: a black square on a transparent ground ---------------------
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);
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

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

// ---- run 1: full intensity, white stroke ---------------------------------
await openEffect('Object', 'Outline');
const order = await page.evaluate(() =>
	[...document.querySelectorAll('.m-dialog .fsl-label')].map((s) => s.textContent.trim())
);
check('Outline dialog has the expected sliders', order.join(',') === 'Width,Intensity', `labels=[${order}]`);
await setSlider(0, 20); // widest stroke, so the change is easy to see
await page.evaluate(() => {
	const row = document.querySelector('.m-dialog .fcol');
	const btn = [...row.querySelectorAll('.fcol-btn')].find((b) => /background/i.test(b.title));
	btn?.click();
});
await sleep(400);
await setSlider(1, 255);
await apply();
const meanFull = await canvasMean();
await undo();

// ---- run 2: half intensity, same white stroke ----------------------------
await openEffect('Object', 'Outline');
const vals = await sliderValues();
await setSlider(0, 20);
await page.evaluate(() => {
	const row = document.querySelector('.m-dialog .fcol');
	const btn = [...row.querySelectorAll('.fcol-btn')].find((b) => /background/i.test(b.title));
	btn?.click();
});
await sleep(400);
await setSlider(1, 128);
const vals2 = await sliderValues();
await apply();
const meanHalf = await canvasMean();
await undo();

check('intensity slider reached 255 then 128', vals2[1] === 128, `values=${JSON.stringify(vals2)} (was ${JSON.stringify(vals)})`);
check(
	'half intensity darkens the stroke (premultiplied)',
	Number.isFinite(meanFull) && Number.isFinite(meanHalf) && meanFull - meanHalf > 3,
	`mean@255=${meanFull?.toFixed(2)} mean@128=${meanHalf?.toFixed(2)} drop=${(meanFull - meanHalf)?.toFixed(2)}`
);
check('no console errors', errors.length === 0, errors.slice(0, 3).join(' / '));

await browser.close();

console.log('--- Object > Outline premultiplied alpha ---');
console.log(`slider labels     : [${order}]`);
console.log(`canvas mean @255  : ${meanFull?.toFixed(2)}`);
console.log(`canvas mean @128  : ${meanHalf?.toFixed(2)}`);
console.log('');
let fails = 0;
for (const r of results) {
	if (!r.ok) fails++;
	console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`);
}
console.log(`\n${results.length - fails}/${results.length} passed   errors : ${errors.length ? errors.length : 'none'}`);
process.exit(fails ? 1 : 0);
