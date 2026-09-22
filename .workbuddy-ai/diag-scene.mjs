// What does the current app look like to a probe? The FilterSlider refactor
// already invalidated one selector; check the rest of the harness assumptions
// (start screen buttons, document creation, the canvas mean) before trusting
// any result.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
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
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const buttons = async (scope) =>
	page.evaluate((s) => {
		const root = s ? document.querySelector(s) : document;
		if (!root) return [`(no ${s})`];
		return [...root.querySelectorAll('button')].map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
	}, scope);

console.log('start screen buttons:');
console.log('  ' + JSON.stringify(await buttons(null)));

const clickByText = async (t) => {
	const hit = await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		if (!b) return false;
		b.click();
		return true;
	}, t);
	await sleep(450);
	return hit;
};
console.log('\nclick New… ->', await clickByText('New…'));
console.log('dialog buttons:', JSON.stringify(await buttons('.m-dialog')));
console.log('click SVGA ->', await clickByText('SVGA'));
console.log('click Create ->', await clickByText('Create'));
await sleep(2000);

const canvasInfo = await page.evaluate(() => {
	const host = document.querySelector('div[style*="touch-action"]');
	if (!host) return { error: 'no canvas host' };
	const r = host.getBoundingClientRect();
	const cv = host.querySelector('canvas');
	return {
		host: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
		canvas: cv ? { w: cv.width, h: cv.height } : null,
		status: document.querySelector('.status-strip')?.textContent?.replace(/\s+/g, ' ').trim() ?? null
	};
});
console.log('\ncanvas:', JSON.stringify(canvasInfo));

const clip = { x: canvasInfo.host.x, y: canvasInfo.host.y, width: canvasInfo.host.w, height: canvasInfo.host.h };
const meanOf = async (label) => {
	const b64 = (await page.screenshot({ clip })).toString('base64');
	const m = await page.evaluate(async (d) => {
		const img = new Image();
		img.src = 'data:image/png;base64,' + d;
		await img.decode();
		const c = document.createElement('canvas');
		c.width = img.width;
		c.height = img.height;
		const ctx = c.getContext('2d');
		ctx.drawImage(img, 0, 0);
		const p = ctx.getImageData(0, 0, c.width, c.height).data;
		let s = 0;
		for (let i = 0; i < p.length; i += 4) s += (p[i] + p[i + 1] + p[i + 2]) / 3;
		return s / (p.length / 4);
	}, b64);
	console.log(`mean after ${label}: ${m.toFixed(1)}`);
	return m;
};
await meanOf('document creation (empty layer)');

// Apply Clouds the way the probes do.
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
});
await sleep(300);
const menuItems = await page.evaluate(() =>
	[...document.querySelectorAll('.menu-panel .menu-item')].map((b) => b.textContent.replace(/\s+/g, ' ').trim())
);
console.log('\nEffects menu:', JSON.stringify(menuItems));
await page.evaluate(() => {
	[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes('Render'))?.click();
});
await sleep(400);
const subItems = await page.evaluate(() =>
	[...document.querySelectorAll('.sub-panel .menu-item')].map((b) => b.textContent.replace(/\s+/g, ' ').trim())
);
console.log('Render submenu:', JSON.stringify(subItems));
await page.evaluate(() => {
	[...document.querySelectorAll('.sub-panel .menu-item')].find((b) => b.textContent.includes('Clouds'))?.click();
});
await sleep(800);
const dlg = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return null;
	const btn = [...d.querySelectorAll('.m-footer button')].map((b) => `${b.textContent.trim()}${b.disabled ? '(disabled)' : ''}`);
	return { title: d.querySelector('.m-title-text')?.textContent?.trim(), buttons: btn, sliders: d.querySelectorAll('.fsl-track').length };
});
console.log('Clouds dialog:', JSON.stringify(dlg));
const clicked = await page.evaluate(() => {
	const b = [...document.querySelectorAll('.m-footer button')].find((x) => x.textContent.includes('Apply'));
	if (b && !b.disabled) {
		b.click();
		return true;
	}
	return false;
});
console.log('Clouds Apply clicked:', clicked);
await sleep(1500);
await meanOf('Clouds');

console.log(`\nerrors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
process.exit(0);
