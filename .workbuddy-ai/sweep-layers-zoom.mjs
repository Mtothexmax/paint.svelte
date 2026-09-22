// Zoom on the Layers panel header and measure the ink centres of the title
// text vs. every icon button, so the alignment claim is a number, not a vibe.
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
await page.setViewport({ width: 1500, height: 950, deviceScaleFactor: 6 });
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
	const title = [...document.querySelectorAll('.panel-title')].find((t) => t.textContent.trim() === 'Layers');
	if (!title) return { found: false };
	const row = title.closest('.panel-head') ?? title.parentElement;
	// Ink centre of the title's TEXT (not its box): a Range over the text node.
	const range = document.createRange();
	range.selectNodeContents(title);
	const tr = range.getBoundingClientRect();
	const buttons = [...row.querySelectorAll('.mini-btn')].map((b) => {
		const r = b.getBoundingClientRect();
		// The glyph ink is the inner text node.
		const rg = document.createRange();
		rg.selectNodeContents(b);
		const gr = rg.getBoundingClientRect();
		return {
			glyph: b.textContent.trim(),
			boxCy: +(r.top + r.height / 2).toFixed(2),
			inkCy: +(gr.top + gr.height / 2).toFixed(2),
			inkTop: +gr.top.toFixed(2)
		};
	});
	const rr = row.getBoundingClientRect();
	return {
		found: true,
		titleInk: { cy: +(tr.top + tr.height / 2).toFixed(2), top: +tr.top.toFixed(2), h: +tr.height.toFixed(2) },
		rowCy: +(rr.top + rr.height / 2).toFixed(2),
		buttons,
		rowRect: { x: Math.round(rr.x), y: Math.round(rr.y), w: Math.round(rr.width), h: Math.round(rr.height) }
	};
});
if (!m.found) {
	console.log('Layers title not found');
} else {
	console.log(`title ink cy=${m.titleInk.cy}  (top=${m.titleInk.top} h=${m.titleInk.h})`);
	console.log(`row cy=${m.rowCy}`);
	const diffs = m.buttons.map((b) => +(b.inkCy - m.titleInk.cy).toFixed(2));
	for (const b of m.buttons) {
		console.log(`  ${b.glyph.padEnd(3)} box cy=${b.boxCy}  ink cy=${b.inkCy}  delta=${(b.inkCy - m.titleInk.cy).toFixed(2)}`);
	}
	console.log(`delta spread = ${(Math.max(...diffs) - Math.min(...diffs)).toFixed(2)}px`);
}
await page.screenshot({
	path: `${OUT}layers-zoom.png`,
	clip: { x: m.rowRect.x - 4, y: m.rowRect.y - 6, width: Math.min(m.rowRect.w + 8, 240), height: m.rowRect.h + 12 }
});
console.log('saved layers-zoom.png');
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
