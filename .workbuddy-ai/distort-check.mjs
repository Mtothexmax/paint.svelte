// Smoke test for the two reported distort bugs:
//  1. the four corner draggers must be visible as soon as Distort is selected
//     (before any click lifts the pixels),
//  2. dragging a corner inward must not make the warp explode.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });

const errors = [];
page.on('console', (m) => {
	if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const countHandles = () =>
	page.$$eval('div.bg-blue-500', (els) => els.length).catch(() => 0);

const clickByText = async (text) => {
	const ok = await page.evaluate((t) => {
		const btns = [...document.querySelectorAll('button')];
		const b = btns.find((x) => (x.textContent ?? '').includes(t));
		if (!b) return false;
		b.click();
		return true;
	}, text);
	if (!ok) throw new Error('button not found: ' + text);
	await new Promise((r) => setTimeout(r, 300));
};

const clickByTitle = async (title) => {
	const ok = await page.evaluate((t) => {
		const b = [...document.querySelectorAll('[title]')].find((x) => x.getAttribute('title') === t);
		if (!b) return false;
		b.click();
		return true;
	}, title);
	if (!ok) throw new Error('element not found by title: ' + title);
	await new Promise((r) => setTimeout(r, 300));
};

// --- make sure a document exists -------------------------------------------
const docCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
console.log('canvases:', docCount);
if (!(await page.evaluate(() => !!document.querySelector('button.btn-primary')))) {
	console.log('no start screen — bailing');
}
await clickByText('New Full HD');
await new Promise((r) => setTimeout(r, 2000));
console.log('canvases after new doc:', await page.evaluate(() => document.querySelectorAll('canvas').length));

// --- 1. draw a rectangular selection ---------------------------------------
// Rectangle Select is the default-ish selection tool; try by title first.
const selTitles = ['Rectangle Select', 'Rectangular Selection', 'Rectangle selection'];
let picked = false;
for (const t of selTitles) {
	const ok = await page.evaluate((tt) => {
		const b = [...document.querySelectorAll('[title]')].find((x) => x.getAttribute('title') === tt);
		if (!b) return false;
		b.click();
		return true;
	}, t);
	if (ok) {
		picked = true;
		console.log('selected tool:', t);
		break;
	}
}
if (!picked) {
	const titles = await page.$$eval('[title]', (els) => [...new Set(els.map((e) => e.getAttribute('title')))]);
	console.log('AVAILABLE TITLES:', JSON.stringify(titles, null, 1));
}
await new Promise((r) => setTimeout(r, 400));

// Drag a big rectangle on the canvas area.
const box = await page.evaluate(() => {
	const c = document.querySelector('canvas');
	if (!c) return null;
	const r = c.getBoundingClientRect();
	return { x: r.x, y: r.y, w: r.width, h: r.height };
});
console.log('canvas box:', box);
if (box) {
	const x0 = box.x + box.w * 0.3;
	const y0 = box.y + box.h * 0.3;
	const x1 = box.x + box.w * 0.7;
	const y1 = box.y + box.h * 0.7;
	await page.mouse.move(x0, y0);
	await page.mouse.down();
	await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 6 });
	await page.mouse.move(x1, y1, { steps: 6 });
	await page.mouse.up();
	await new Promise((r) => setTimeout(r, 500));
}

// --- 2. switch to Move Selected Pixels -------------------------------------
await clickByTitle('Move Selected Pixels');

// --- 3. select the Distort sub-mode ----------------------------------------
await clickByText('Distort');
await new Promise((r) => setTimeout(r, 600));

const handlesAfterDistort = await countHandles();
console.log('BUG1 hand draggers visible right after selecting Distort:', handlesAfterDistort);

// --- 4. drag a corner inward ------------------------------------------------
// Grab the top-left dragger and pull it toward the opposite corner.
const hs = await page.$$eval('div.bg-blue-500', (els) =>
	els.map((e) => {
		const r = e.getBoundingClientRect();
		return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
	})
);
console.log('dragger positions:', JSON.stringify(hs));
if (hs.length >= 4) {
	// nw is the smallest x+y
	const nw = hs.reduce((a, b) => (a.x + a.y <= b.x + b.y ? a : b));
	const se = hs.reduce((a, b) => (a.x + a.y >= b.x + b.y ? a : b));
	await page.mouse.move(nw.x, nw.y);
	await page.mouse.down();
	for (let i = 1; i <= 12; i++) {
		await page.mouse.move(nw.x + ((se.x - nw.x) * i) / 12, nw.y + ((se.y - nw.y) * i) / 12);
		await new Promise((r) => setTimeout(r, 40));
	}
	await page.mouse.up();
	await new Promise((r) => setTimeout(r, 600));
	const after = await page.$$eval('div.bg-blue-500', (els) =>
		els.map((e) => {
			const r = e.getBoundingClientRect();
			return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
		})
	);
	console.log('draggers after inward drag:', JSON.stringify(after));
	// Every dragger must still be on screen (an exploded warp throws them far
	// outside the viewport).
	const exploded = after.some((p) => Math.abs(p.x) > 100000 || Math.abs(p.y) > 100000 || !Number.isFinite(p.x));
	console.log('BUG2 warp exploded:', exploded);
}

console.log('console errors:', errors.length ? JSON.stringify(errors.slice(0, 8), null, 1) : 'none');
await page.screenshot({ path: '.workbuddy-ai/distort-shot.png' });

// --- 5. switch to Rotate and confirm the 3 axis rings still render ---------
await clickByText('Move');
await new Promise((r) => setTimeout(r, 200));
await clickByText('Rotate');
await new Promise((r) => setTimeout(r, 600));
const rings = await page.$$eval('svg path[d]', (els) => els.length);
console.log('rotate rings on screen:', rings);

await page.screenshot({ path: '.workbuddy-ai/rotate-shot.png' });
await browser.close();
