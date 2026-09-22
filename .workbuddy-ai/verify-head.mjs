// Verify the header rule now spans the full row (was: only the title's width)
// and that the title/icons are still on one line after the padding change.
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/paint.svelte/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950, deviceScaleFactor: 4 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickByText = async (t) => {
	await page.evaluate((x) => {
		[...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x))?.click();
	}, t);
	await sleep(500);
};
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1800);

const m = await page.evaluate(() => {
	const out = {};
	// Layers: the opt-in `.panel-head` row.
	const lTitle = [...document.querySelectorAll('.panel-title')].find((t) => t.textContent.trim() === 'Layers');
	const row = lTitle.closest('.panel-head');
	const rr = row.getBoundingClientRect();
	const after = getComputedStyle(row, '::after');
	const range = document.createRange();
	range.selectNodeContents(lTitle);
	const tr = range.getBoundingClientRect();
	const btn = row.querySelector('.mini-btn');
	const rg = document.createRange();
	rg.selectNodeContents(btn);
	const gr = rg.getBoundingClientRect();
	out.layers = {
		rowW: +rr.width.toFixed(2),
		titleW: +tr.width.toFixed(2),
		ruleW: parseFloat(after.width),
		ruleH: after.height,
		ruleBottom: after.bottom,
		titleInkCy: +(tr.top + tr.height / 2).toFixed(2),
		btnInkCy: +(gr.top + gr.height / 2).toFixed(2),
		rowRect: { x: Math.round(rr.x), y: Math.round(rr.y), w: Math.round(rr.width), h: Math.round(rr.height) }
	};
	// History: the standalone title, for comparison.
	const hTitle = [...document.querySelectorAll('.panel-title')].find((t) => t.textContent.trim() === 'History');
	const hr = hTitle.getBoundingClientRect();
	out.history = { titleW: +hr.width.toFixed(2), parentW: +hTitle.parentElement.getBoundingClientRect().width.toFixed(2) };
	return out;
});
console.log(`LAYERS row w=${m.layers.rowW}  title ink w=${m.layers.titleW}  rule w=${m.layers.ruleW} h=${m.layers.ruleH} bottom=${m.layers.ruleBottom}`);
console.log(`  rule spans row: ${Math.abs(m.layers.ruleW - m.layers.rowW) < 0.6}`);
console.log(`  title ink cy=${m.layers.titleInkCy}  first btn ink cy=${m.layers.btnInkCy}  delta=${(m.layers.btnInkCy - m.layers.titleInkCy).toFixed(2)}`);
console.log(`HISTORY title w=${m.history.titleW} (panel inner ${m.history.parentW})`);
await page.screenshot({
	path: `${OUT}layers-zoom2.png`,
	clip: { x: m.layers.rowRect.x - 4, y: m.layers.rowRect.y - 6, width: Math.min(m.layers.rowRect.w + 8, 240), height: m.layers.rowRect.h + 14 }
});
console.log('saved layers-zoom2.png');
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
