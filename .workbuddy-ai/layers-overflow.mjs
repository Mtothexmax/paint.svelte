// Reproduce: does opening the inline rename editor widen the row and give the
// layer list a HORIZONTAL scrollbar?
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5174/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
const errors = [];
page.on('console', (m) => {
	if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await new Promise((r) => setTimeout(r, 450));
};
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1500));

// Enough layers to make the list scroll vertically (and get a v-scrollbar).
await page.evaluate(() => {
	const b = [...document.querySelectorAll('button')].find((x) => x.title === 'Add layer');
	for (let i = 0; i < 14; i++) b?.click();
});
await new Promise((r) => setTimeout(r, 1500));

const measure = (label) =>
	page.evaluate((lbl) => {
		const list = document.querySelector('.layer-list');
		if (!list) return { label: lbl, error: 'no .layer-list' };
		const row = list.querySelector('.layer-row');
		const cs = getComputedStyle(list);
		const out = {
			label: lbl,
			list: {
				clientWidth: list.clientWidth,
				scrollWidth: list.scrollWidth,
				overflowX: cs.overflowX,
				overflowY: cs.overflowY,
				hScroll: list.scrollWidth > list.clientWidth,
				vScroll: list.scrollHeight > list.clientHeight
			},
			row: row ? { clientWidth: row.clientWidth, scrollWidth: row.scrollWidth } : null
		};
		// widest descendant relative to the list's content box
		if (row) {
			const lr = list.getBoundingClientRect();
			let widest = null;
			for (const el of row.querySelectorAll('*')) {
				const r = el.getBoundingClientRect();
				if (!widest || r.right > widest.right) {
					widest = { right: Math.round(r.right), cls: el.className || el.tagName };
				}
			}
			out.widestDescendant = widest;
			out.listRight = Math.round(lr.right);
			out.overflowPx = widest ? Math.round(widest.right - lr.right) : null;
		}
		return out;
	}, label);

console.log('BEFORE  :', JSON.stringify(await measure('before'), null, 0));

const names = await page.$$('.layer-name');
await names[0].click();
await new Promise((r) => setTimeout(r, 500));
console.log('AFTER   :', JSON.stringify(await measure('after'), null, 0));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
