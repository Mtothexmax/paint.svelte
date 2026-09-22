// Full-app visual sweep: screenshot the whole shell plus each chrome surface
// (menubar, options strip, toolbar, sidebar panels, tab tray, status strip)
// so the remaining gaps vs. opacity-slider.html can be judged by eye.
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
await page.setViewport({ width: 1500, height: 950, deviceScaleFactor: 2 });
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
await sleep(2000);

// Paint a couple of strokes so the canvas isn't empty and History fills.
await page.mouse.move(760, 430);
await page.mouse.down();
for (let i = 0; i < 24; i++) await page.mouse.move(760 + i * 9, 430 + Math.sin(i / 3) * 40);
await page.mouse.up();
await sleep(600);
await page.mouse.move(800, 500);
await page.mouse.down();
for (let i = 0; i < 18; i++) await page.mouse.move(800 + i * 8, 500 - Math.cos(i / 4) * 30);
await page.mouse.up();
await sleep(900);

await page.screenshot({ path: `${OUT}sweep-full.png` });

// Per-surface crops + a computed-style dump of the key chrome tokens.
const surfaces = await page.evaluate(() => {
	const pick = (sel) => {
		const el = document.querySelector(sel);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		const cs = getComputedStyle(el);
		return {
			sel,
			rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
			bg: cs.backgroundColor,
			bgImg: cs.backgroundImage.slice(0, 90),
			border: cs.borderTopWidth + ' ' + cs.borderTopColor,
			radius: cs.borderRadius,
			shadow: cs.boxShadow.slice(0, 120),
			after: cs.content
		};
	};
	return {
		menubar: pick('.menubar-strip'),
		options: pick('.options-strip'),
		toolbar: pick('.toolbar-col'),
		sidebar: pick('.sidebar-col'),
		panelCard: pick('.panel-card'),
		status: pick('.status-strip'),
		canvasHost: pick('canvas') ? null : null,
		theme: (() => {
			const cs = getComputedStyle(document.documentElement);
			const names = [
				'--chrome-hi', '--chrome-lo', '--chrome-bar1', '--chrome-bar2',
				'--well', '--accent', '--accent-ring', '--accent-glow',
				'--text', '--text-dim', '--text-faint', '--bg', '--bg-elev', '--border'
			];
			const o = {};
			for (const n of names) o[n] = cs.getPropertyValue(n).trim();
			return o;
		})()
	};
});
console.log(JSON.stringify(surfaces, null, 2));

// Crops for eyeballing.
const crop = async (sel, name) => {
	const box = await page.evaluate((s) => {
		const el = document.querySelector(s);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
	}, sel);
	if (!box || box.width < 2 || box.height < 2) {
		console.log(`skip ${name} (${sel})`);
		return;
	}
	await page.screenshot({ path: `${OUT}sweep-${name}.png`, clip: box });
	console.log(`saved sweep-${name}.png ${JSON.stringify(box)}`);
};
await crop('.menubar-strip', 'menubar');
await crop('.options-strip', 'options');
await crop('.toolbar-col', 'toolbar');
await crop('.sidebar-col', 'sidebar');
await crop('.status-strip', 'status');
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
