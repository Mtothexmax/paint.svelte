// Does the menubar open from a REAL mouse click vs a synthetic .click()?
// The whole probe suite drives menus with el.click(); if the menu now opens on
// pointerdown (or closes on the bubbled click) every one of them is broken.
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

const state = async (label) => {
	const s = await page.evaluate(() => ({
		panels: document.querySelectorAll('.menu-panel').length,
		items: document.querySelectorAll('.menu-panel .menu-item').length,
		firstItem: document.querySelector('.menu-panel .menu-item')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
		barBtnTexts: [...document.querySelectorAll('.menubar-btn')].map((b) => b.textContent.trim())
	}));
	console.log(`${label}: panels=${s.panels} items=${s.items} first=${JSON.stringify(s.firstItem)}`);
	console.log(`   menubar: ${JSON.stringify(s.barBtnTexts)}`);
	return s;
};

await state('initial');

// --- synthetic click (what every probe does) ---
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
});
await sleep(400);
await state('after synthetic .click() on Effects');
await page.keyboard.press('Escape');
await sleep(300);

// --- real mouse click ---
const box = await page.evaluate(() => {
	const b = [...document.querySelectorAll('.menubar-btn')].find((x) => x.textContent.trim() === 'Effects');
	if (!b) return null;
	const r = b.getBoundingClientRect();
	return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
console.log(`\nEffects button at ${JSON.stringify(box)}`);
await page.mouse.click(box.x, box.y);
await sleep(400);
await state('after real mouse click on Effects');

// --- real hover ---
await page.keyboard.press('Escape');
await sleep(300);
await page.mouse.move(box.x, box.y);
await sleep(400);
await state('after real hover on Effects');

// Submenu: hover the "Render" entry, then click it twice (the old bug).
const subBox = await page.evaluate(() => {
	const it = [...document.querySelectorAll('.menu-panel .menu-item')].find((x) => x.textContent.includes('Render'));
	if (!it) return null;
	const r = it.getBoundingClientRect();
	return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
console.log(`\nRender entry at ${JSON.stringify(subBox)}`);
if (subBox) {
	await page.mouse.move(subBox.x, subBox.y);
	await sleep(500);
	const a = await page.evaluate(() => document.querySelectorAll('.sub-panel .menu-item').length);
	await page.mouse.click(subBox.x, subBox.y);
	await sleep(400);
	const b = await page.evaluate(() => document.querySelectorAll('.sub-panel .menu-item').length);
	await page.mouse.click(subBox.x, subBox.y);
	await sleep(400);
	const c = await page.evaluate(() => document.querySelectorAll('.sub-panel .menu-item').length);
	console.log(`submenu items: hover=${a}  click1=${b}  click2=${c}`);
	const subs = await page.evaluate(() =>
		[...document.querySelectorAll('.sub-panel .menu-item')].map((x) => x.textContent.replace(/\s+/g, ' ').trim())
	);
	console.log(`submenu contents: ${JSON.stringify(subs)}`);
}

console.log(`\nerrors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
process.exit(0);
