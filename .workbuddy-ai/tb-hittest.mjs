// The options strip's primary button is pushed to the far right (ml-auto),
// which is inside the .tab-tray-overlay box (absolute, left:75%, z-index 40).
// If that overlay swallows pointer events, the button is unclickable.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
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
	await sleep(450);
};
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1800);

await page.evaluate(() => document.querySelector('.tool-btn[aria-label="Rectangle Select"]')?.click());
await sleep(500);

// Make a selection so the primary action appears.
const c = await page.evaluate(() => {
	const r = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await page.mouse.move(c.x + c.w * 0.3, c.y + c.h * 0.3);
await page.mouse.down();
await page.mouse.move(c.x + c.w * 0.6, c.y + c.h * 0.6, { steps: 12 });
await page.mouse.up();
await sleep(800);

const probe = await page.evaluate(() => {
	const btn = document.querySelector('.options-strip .tb-btn.primary');
	if (!btn) return { found: false };
	const r = btn.getBoundingClientRect();
	const cx = r.left + r.width / 2;
	const cy = r.top + r.height / 2;
	const hit = document.elementFromPoint(cx, cy);
	const tray = document.querySelector('.tab-tray-overlay');
	const tr = tray?.getBoundingClientRect();
	return {
		found: true,
		rect: { x: +r.x.toFixed(0), y: +r.y.toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) },
		centre: { cx: +cx.toFixed(0), cy: +cy.toFixed(0) },
		hitTag: hit ? `${hit.tagName}.${(hit.className || '').toString().split(' ')[0]}` : null,
		hitIsButtonOrChild: !!(hit && hit.closest('.tb-btn')),
		tray: tr ? { x: +tr.x.toFixed(0), w: +tr.width.toFixed(0), h: +tr.height.toFixed(0) } : null,
		trayCoversCentre: tr ? cx >= tr.x && cx <= tr.right && cy >= tr.y && cy <= tr.bottom : false,
		trayPointerEvents: tray ? getComputedStyle(tray).pointerEvents : null
	};
});

console.log('primary button:', JSON.stringify(probe.rect));
console.log('tab tray     :', JSON.stringify(probe.tray), 'pointer-events:', probe.trayPointerEvents);
console.log(`tray box covers the button centre: ${probe.trayCoversCentre}`);
console.log(`elementFromPoint at the button centre -> ${probe.hitTag}`);
console.log(`=> the button receives the click: ${probe.hitIsButtonOrChild}`);

// Prove it with a real mouse click: does the document actually get cropped?
const before = await page.evaluate(() => {
	const cv = document.querySelector('canvas');
	return cv ? `${cv.width}x${cv.height}` : null;
});
await page.mouse.click(probe.centre.cx, probe.centre.cy);
await sleep(1200);
const after = await page.evaluate(() => {
	const cv = document.querySelector('canvas');
	return cv ? `${cv.width}x${cv.height}` : null;
});
console.log(`canvas ${before} -> ${after}  (a real click crops the image)`);

console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
