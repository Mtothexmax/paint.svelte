// Sample a grid inside the Effects menu's box and report anything that is NOT
// part of the menu — i.e. something painting over it. Run in two states: with
// the docked Layer Effects panel closed and open.
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/paint.svelte/';
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

const sample = () =>
	page.evaluate(() => {
		const m = document.querySelector('.fx-add-menu');
		if (!m) return { found: false };
		const r = m.getBoundingClientRect();
		const counts = new Map();
		for (let i = 1; i <= 9; i++) {
			for (let j = 1; j <= 7; j++) {
				const x = Math.round(r.left + (r.width * i) / 10);
				const y = Math.round(r.top + (r.height * j) / 8);
				if (y < 0 || y > window.innerHeight || x < 0 || x > window.innerWidth) continue;
				const el = document.elementFromPoint(x, y);
				if (!el) continue;
				const inside = m.contains(el);
				const key = `${inside ? 'menu:' : 'OVER:'}${el.tagName}.${(el.className || '').toString().split(' ').slice(0, 2).join('.')}`;
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
		}
		// z-index of the things around it
		const zOf = (sel) => {
			const e = document.querySelector(sel);
			return e ? `${getComputedStyle(e).zIndex}/${getComputedStyle(e).position}` : 'absent';
		};
		return {
			found: true,
			rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
			hits: [...counts.entries()].sort((a, b) => b[1] - a[1]),
			z: {
				'fx-add-menu': zOf('.fx-add-menu'),
				'fx-add-backdrop': zOf('.fx-add-backdrop'),
				'fx-panel': zOf('.fx-panel'),
				'menu-panel': zOf('.menu-panel'),
				'tab-tray-overlay': zOf('.tab-tray-overlay'),
				'options-strip': zOf('.options-strip'),
				'status-strip': zOf('.status-strip')
			}
		};
	});

const run = async (label) => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
	});
	await sleep(900);
	const s = await sample();
	console.log(`\n=== ${label} ===`);
	if (!s.found) {
		console.log('  menu did not open');
		return;
	}
	console.log(`  rect: ${JSON.stringify(s.rect)}`);
	console.log(`  z-index/position: ${JSON.stringify(s.z)}`);
	for (const [k, n] of s.hits) console.log(`    ${String(n).padStart(3)}x  ${k}`);
	const over = s.hits.filter(([k]) => k.startsWith('OVER:'));
	console.log(`  covered cells: ${over.reduce((a, [, n]) => a + n, 0)}${over.length ? ' -> ' + over.map(([k]) => k).join(', ') : ''}`);
	// close the menu
	await page.keyboard.press('Escape');
	await sleep(400);
	await page.evaluate(() => document.body.click());
	await sleep(400);
};

await run('document open, Layer Effects panel CLOSED');

// Open the docked Layer Effects panel (View menu) and repeat.
const opened = await page.evaluate(() => {
	const btn = [...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'View');
	btn?.click();
	return !!btn;
});
await sleep(500);
const item = await page.evaluate(() => {
	const it = [...document.querySelectorAll('.menu-panel .menu-item')].find((x) => /layer effect/i.test(x.textContent));
	it?.click();
	return it ? it.textContent.trim() : null;
});
await sleep(900);
console.log(`\n(View ▸ "${item}" clicked=${opened})  fx-panel present: ${await page.evaluate(() => !!document.querySelector('.fx-panel'))}`);
await run('document open, Layer Effects panel OPEN');

console.log(`\nerrors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
