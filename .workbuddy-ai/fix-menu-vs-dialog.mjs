// Is the menubar Effects menu usable while an effect dialog is open? The
// dialog is z-index 1200; the browser menu is 62. If the dialog wins, the
// menu is unreachable from the menubar while any dialog is up.
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
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
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

// Open an effect dialog (non-modal movable dialog).
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
});
await sleep(600);
await page.evaluate(() => {
	const s = document.querySelector('.fx-add-search');
	if (s) {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, 'Gaussian Blur');
		s.dispatchEvent(new Event('input', { bubbles: true }));
	}
});
await sleep(500);
await page.evaluate(() => {
	[...document.querySelectorAll('.fx-add-item')].find((x) => x.textContent.includes('Gaussian Blur'))?.click();
});
await sleep(1300);
console.log(`dialog open: ${await page.evaluate(() => !!document.querySelector('.m-dialog'))}`);

// Now click the Effects menubar button again.
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
});
await sleep(900);

const r = await page.evaluate(() => {
	const m = document.querySelector('.fx-add-menu');
	if (!m) return { found: false };
	const mr = m.getBoundingClientRect();
	const d = document.querySelector('.m-dialog');
	const dr = d.getBoundingClientRect();
	// Sample the band where the menu and the dialog overlap.
	const x0 = Math.max(mr.left, dr.left);
	const x1 = Math.min(mr.right, dr.right);
	const y0 = Math.max(mr.top, dr.top);
	const y1 = Math.min(mr.bottom, dr.bottom);
	let over = 0;
	let menu = 0;
	const kinds = new Set();
	for (let i = 1; i <= 6; i++) {
		for (let j = 1; j <= 6; j++) {
			const x = Math.round(x0 + ((x1 - x0) * i) / 7);
			const y = Math.round(y0 + ((y1 - y0) * j) / 7);
			const el = document.elementFromPoint(x, y);
			if (!el) continue;
			if (m.contains(el)) menu++;
			else {
				over++;
				kinds.add(`${el.tagName}.${(el.className || '').toString().split(' ')[0]}`);
			}
		}
	}
	return {
		found: true,
		menuZ: getComputedStyle(m).zIndex,
		dialogZ: getComputedStyle(d).zIndex,
		menuRect: { x: Math.round(mr.x), y: Math.round(mr.y), w: Math.round(mr.width), h: Math.round(mr.height) },
		dialogRect: { x: Math.round(dr.x), y: Math.round(dr.y), w: Math.round(dr.width), h: Math.round(dr.height) },
		menuCells: menu,
		overCells: over,
		overKinds: [...kinds]
	};
});
console.log(`menu z=${r.menuZ}  dialog z=${r.dialogZ}`);
console.log(`menu ${JSON.stringify(r.menuRect)}`);
console.log(`dialog ${JSON.stringify(r.dialogRect)}`);
console.log(`in the overlap band: menu cells=${r.menuCells}  covered cells=${r.overCells}`);
console.log(`covering elements: ${r.overKinds.join(', ') || '(none)'}`);
console.log(`=> menubar Effects menu reachable while a dialog is open: ${r.overCells === 0}`);
await page.screenshot({ path: `${OUT}fxmenu-vs-dialog.png` });
console.log('saved fxmenu-vs-dialog.png');
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
