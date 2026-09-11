// Regression: opening the inline rename editor must NOT widen the row or give
// the layer list a horizontal scrollbar — including with a squeezed panel and
// a long name, which is where the old flex-basis:auto input blew up.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
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

// 14 layers => vertical scrollbar present, like the user's case.
await page.evaluate(() => {
	const b = [...document.querySelectorAll('button')].find((x) => x.title === 'Add layer');
	for (let i = 0; i < 14; i++) b?.click();
});
await new Promise((r) => setTimeout(r, 1200));

// Give the first layer a very long name (worst case for width).
await page.evaluate(() => {
	const n = document.querySelector('.layer-name');
	if (n) {
		n.click();
	}
});
await new Promise((r) => setTimeout(r, 300));
await page.keyboard.down('Control');
await page.keyboard.press('a');
await page.keyboard.up('Control');
await page.keyboard.type('A Really Long Layer Name That Would Never Fit');
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 500));

const probe = () =>
	page.evaluate(() => {
		const list = document.querySelector('.layer-list');
		const rows = [...list.querySelectorAll('.layer-row')];
		const lr = list.getBoundingClientRect();
		let worst = -Infinity;
		let worstEl = null;
		for (const el of list.querySelectorAll('*')) {
			const r = el.getBoundingClientRect();
			if (r.right - lr.right > worst) {
				worst = r.right - lr.right;
				worstEl = (el.className || el.tagName).toString().split(' ')[0];
			}
		}
		return {
			clientWidth: list.clientWidth,
			scrollWidth: list.scrollWidth,
			hScroll: list.scrollWidth > list.clientWidth,
			overflowX: getComputedStyle(list).overflowX,
			rows: rows.length,
			worstOverflowPx: Math.round(worst),
			worstEl
		};
	});

console.log('idle (long name) :', JSON.stringify(await probe()));

// Now open the editor on that row.
await page.evaluate(() => document.querySelectorAll('.layer-name')[0].click());
await new Promise((r) => setTimeout(r, 400));
const open = await page.evaluate(() => {
	const inp = document.querySelector('.layer-rename');
	const list = document.querySelector('.layer-list');
	const row = inp?.closest('.layer-row');
	return {
		open: !!inp,
		inputW: inp ? Math.round(inp.getBoundingClientRect().width) : null,
		inputRight: inp ? Math.round(inp.getBoundingClientRect().right) : null,
		rowRight: row ? Math.round(row.getBoundingClientRect().right) : null,
		focused: inp ? document.activeElement === inp : null
	};
});
console.log('editor open      :', JSON.stringify(open));
console.log('while editing    :', JSON.stringify(await probe()));

// Squeeze the panel to 140px and re-measure — the old input overflowed here.
await page.evaluate(() => {
	const col = document.querySelector('.sidebar-col');
	if (col) col.style.width = '140px';
});
await new Promise((r) => setTimeout(r, 400));
console.log('squeezed 140px   :', JSON.stringify(await probe()));

// Prove the diagnosis: put the OLD rules back and see the overflow return.
await page.evaluate(() => {
	const s = document.createElement('style');
	s.id = '__oldcss';
	s.textContent = `
		.layer-list { overflow-x: auto !important; }
		.layer-rename { flex: 1 1 auto !important; width: auto !important; }
	`;
	document.head.appendChild(s);
});
await new Promise((r) => setTimeout(r, 400));
console.log('with OLD css     :', JSON.stringify(await probe()));
await page.evaluate(() => document.getElementById('__oldcss')?.remove());

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
