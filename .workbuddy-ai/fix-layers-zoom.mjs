// High-zoom crop of the Layers title area: does the rule under the words
// still render, and do the icons line up?
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
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 6 });
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

const g = await page.evaluate(() => {
	const t = [...document.querySelectorAll('.panel-title')].find((x) => x.textContent.trim() === 'Layers');
	const tr = t.getBoundingClientRect();
	const row = t.closest('.panel-head').getBoundingClientRect();
	return {
		tl: +tr.left.toFixed(2),
		tt: +tr.top.toFixed(2),
		tb: +tr.bottom.toFixed(2),
		rt: +row.top.toFixed(2),
		rb: +row.bottom.toFixed(2)
	};
});
console.log(`title ${g.tt}..${g.tb} left=${g.tl}   row ${g.rt}..${g.rb}`);
console.log(`rule should paint at y=${(g.tb + 3).toFixed(2)}`);

await page.screenshot({
	path: `${OUT}fix-layers-zoom.png`,
	clip: { x: g.tl - 3, y: g.rt - 3, width: 46, height: (g.rb - g.rt) + 12 }
});
console.log('saved fix-layers-zoom.png (6x)');
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
