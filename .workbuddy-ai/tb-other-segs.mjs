// The active-segment style is shared, so the two other .seg users (Resize
// Image dialog, colour-picker panel) must still read correctly.
import puppeteer from 'puppeteer-core';

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
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
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

// 1. Resize Image dialog (Image > Resize Image…) — uses .seg for Resize/Canvas.
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Image')?.click();
});
await sleep(400);
await page.evaluate(() => {
	[...document.querySelectorAll('.menu-panel .menu-item')].find((x) => x.textContent.includes('Resize'))?.click();
});
await sleep(900);
const dlg = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return null;
	const on = d.querySelector('.seg-btn.on');
	const off = d.querySelector('.seg-btn:not(.on)');
	return {
		title: d.querySelector('.m-title-text')?.textContent?.trim() ?? null,
		onText: on?.textContent?.trim() ?? null,
		onBg: on ? getComputedStyle(on).backgroundImage : null,
		onColor: on ? getComputedStyle(on).color : null,
		offColor: off ? getComputedStyle(off).color : null
	};
});
console.log('resize dialog:', JSON.stringify(dlg));
if (dlg) {
	const clip = await page.evaluate(() => {
		const d = document.querySelector('.m-dialog').getBoundingClientRect();
		return { x: Math.round(d.x) - 8, y: Math.round(d.y) - 8, width: Math.round(d.width) + 16, height: Math.round(d.height) + 16 };
	});
	await page.screenshot({ path: `${OUT}tb-other-resize.png`, clip });
	console.log('saved tb-other-resize.png');
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(600);
}

// 2. Colour picker panel (the docked one) — uses .seg for FG/BG.
await page.evaluate(() => {
	const b = [...document.querySelectorAll('button')].find((x) => /color/i.test(x.getAttribute('aria-label') ?? ''));
	b?.click();
});
await sleep(1200);
const cp = await page.evaluate(() => {
	const seg = document.querySelector('.color-mode .seg, .seg');
	if (!seg) return null;
	const on = seg.querySelector('.seg-btn.on');
	const r = seg.getBoundingClientRect();
	return {
		onText: on?.textContent?.trim() ?? null,
		onBg: on ? getComputedStyle(on).backgroundImage : null,
		rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
	};
});
console.log('colour panel seg:', JSON.stringify(cp));
await page.screenshot({ path: `${OUT}tb-other-colorpanel.png` });
console.log('saved tb-other-colorpanel.png');

console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
