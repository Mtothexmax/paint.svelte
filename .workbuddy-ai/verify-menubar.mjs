// Did "AI Models" land at the far right of the menubar, and does it still open?
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
await sleep(1800);

const r = await page.evaluate(() => {
	const strip = document.querySelector('.menubar-strip');
	const tray = document.querySelector('.tab-tray-overlay');
	const sr = strip.getBoundingClientRect();
	const btns = [...document.querySelectorAll('.menubar-btn')].map((b) => {
		const q = b.getBoundingClientRect();
		return { label: b.textContent.trim(), x: Math.round(q.x), right: Math.round(q.right), w: Math.round(q.width) };
	});
	const ai = btns[btns.length - 1];
	const trayR = tray ? tray.getBoundingClientRect() : null;
	// Where does the tab content actually sit inside the tray?
	const tab = document.querySelector('.fltab');
	const tabR = tab ? tab.getBoundingClientRect() : null;
	return {
		strip: { x: Math.round(sr.x), w: Math.round(sr.width), right: Math.round(sr.right) },
		btns,
		trayLeft: trayR ? Math.round(trayR.left) : null,
		tabLeft: tabR ? Math.round(tabR.left) : null,
		tabRight: tabR ? Math.round(tabR.right) : null
	};
});
console.log('menubar order (left → right):');
for (const b of r.btns) console.log(`  ${b.label.padEnd(12)} x=${String(b.x).padStart(5)}  right=${String(b.right).padStart(5)}  w=${b.w}`);
const ai = r.btns[r.btns.length - 1];
console.log(`\nrightmost menu: "${ai.label}"  (right edge ${ai.right} of strip ${r.strip.w})`);
console.log(`is it the LAST in DOM order: ${ai.label === 'AI Models'}`);
console.log(`tab-tray starts at x=${r.trayLeft}; first tab spans ${r.tabLeft}–${r.tabRight}`);
console.log(`AI Models ends at ${ai.right} -> clear of the tray by ${r.trayLeft - ai.right}px`);

// Does it still open its menu?
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'AI Models')?.click();
});
await sleep(700);
const open = await page.evaluate(() => {
	const p = document.querySelector('.menu-panel');
	if (!p) return { open: false };
	const r = p.getBoundingClientRect();
	return {
		open: true,
		items: [...p.querySelectorAll('.menu-item')].map((x) => x.textContent.trim()),
		rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
	};
});
console.log(`\nAI Models menu opens: ${open.open}  items=${JSON.stringify(open.items)}`);
await page.screenshot({ path: `${OUT}menubar-order.png`, clip: { x: 0, y: 0, width: r.strip.w, height: 30 } });
console.log('saved menubar-order.png');
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
