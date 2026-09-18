// Diagnostic: where does the document actually sit inside the canvas host, and
// where do the motion-blur edge modes change pixels? Saves two frames to disk.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
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

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);

const clip = await page.evaluate(() => {
	const b = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
});
console.log('canvas host rect :', JSON.stringify(clip));

// any other canvases in the page (the real document surface?)
const canvases = await page.evaluate(() =>
	[...document.querySelectorAll('canvas')].map((c) => {
		const r = c.getBoundingClientRect();
		return { w: c.width, h: c.height, x: Math.round(r.x), y: Math.round(r.y), rw: Math.round(r.width), rh: Math.round(r.height) };
	})
);
console.log('canvases         :', JSON.stringify(canvases, null, 1));

// flood the whole layer black
await pickTool('Paint Bucket');
await page.mouse.move(clip.x + Math.round(clip.width / 2), clip.y + Math.round(clip.height / 2));
await page.mouse.down();
await page.mouse.up();
await sleep(900);
await page.screenshot({ path: `${OUT}diag-flood.png`, clip });

// apply Motion Blur, Transparent, long horizontal streak
await openEffect('Blurs', 'Motion Blur');
await page.evaluate(() => {
	const set = (el, v) => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
		el.dispatchEvent(new Event('input', { bubbles: true }));
		el.dispatchEvent(new Event('change', { bubbles: true }));
	};
	const dial = document.querySelector('.m-dialog .ang-num');
	if (dial) set(dial, 90);
	const range = document.querySelector('.m-dialog .fsl-range');
	if (range) set(range, 200);
	const sel = document.querySelector('.m-dialog .fsel-input');
	if (sel) {
		sel.value = '3';
		sel.dispatchEvent(new Event('change', { bubbles: true }));
	}
});
await sleep(500);
await apply();
await page.screenshot({ path: `${OUT}diag-transparent.png`, clip });

// Where is the black content? scan the flood frame for dark columns/rows.
const bounds = await page.evaluate(async (data) => {
	const img = new Image();
	img.src = 'data:image/png;base64,' + data;
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
	// column means
	const cols = [];
	for (let x = 0; x < c.width; x++) {
		let s = 0;
		for (let y = 0; y < c.height; y++) s += lum(x, y);
		cols.push(s / c.height);
	}
	const rows = [];
	for (let y = 0; y < c.height; y++) {
		let s = 0;
		for (let x = 0; x < c.width; x++) s += lum(x, y);
		rows.push(s / c.width);
	}
	const darkCols = cols.map((v, i) => (v < 12 ? i : -1)).filter((i) => i >= 0);
	const darkRows = rows.map((v, i) => (v < 12 ? i : -1)).filter((i) => i >= 0);
	return {
		w: c.width,
		h: c.height,
		col0: cols.slice(0, 8).map((v) => +v.toFixed(1)),
		colLast: cols.slice(-8).map((v) => +v.toFixed(1)),
		row0: rows.slice(0, 8).map((v) => +v.toFixed(1)),
		rowLast: rows.slice(-8).map((v) => +v.toFixed(1)),
		darkColRange: darkCols.length ? [darkCols[0], darkCols[darkCols.length - 1]] : null,
		darkRowRange: darkRows.length ? [darkRows[0], darkRows[darkRows.length - 1]] : null
	};
}, (await page.screenshot({ clip })).toString('base64'));

console.log('flood frame      :', JSON.stringify(bounds));
await browser.close();
