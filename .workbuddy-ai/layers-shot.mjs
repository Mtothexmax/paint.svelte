// Screenshot the Layers panel: idle, hovered, and with the inline rename open.
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/';
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
page.on('console', (m) => {
	if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
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

// Add a couple of layers so there is something to look at.
await page.evaluate(() => {
	const b = [...document.querySelectorAll('button')].find((x) => x.title === 'Add layer');
	b?.click();
	b?.click();
	b?.click();
});
await new Promise((r) => setTimeout(r, 1200));

const panel = await page.evaluateHandle(() => {
	const t = [...document.querySelectorAll('.panel-title')].find((e) => e.textContent.trim() === 'Layers');
	return t ? t.closest('.panel-card') : null;
});
const el = panel.asElement();
if (!el) throw new Error('layers panel not found');

await el.screenshot({ path: OUT + 'layers-idle.png' });

// Hover a row that has NO effects -> the fx badge should appear.
const rows = await page.$$('.layer-row');
console.log('rows:', rows.length);
if (rows.length) {
	await rows[0].hover();
	await new Promise((r) => setTimeout(r, 400));
	await el.screenshot({ path: OUT + 'layers-hover.png' });
}

// Click the name of the second row -> rename editor.
const names = await page.$$('.layer-name');
console.log('names:', names.length);
if (names.length > 1) {
	await names[1].click();
	await new Promise((r) => setTimeout(r, 500));
	const st = await page.evaluate(() => {
		const inp = document.querySelector('.layer-rename');
		if (!inp) return { open: false };
		const r = inp.getBoundingClientRect();
		const row = inp.closest('.layer-row')?.getBoundingClientRect();
		const list = inp.closest('.layer-list')?.getBoundingClientRect();
		return {
			open: true,
			input: { x: Math.round(r.x), w: Math.round(r.width), right: Math.round(r.right) },
			row: row ? { x: Math.round(row.x), right: Math.round(row.right) } : null,
			list: list ? { x: Math.round(list.x), right: Math.round(list.right) } : null,
			overflowsRow: row ? r.right > row.right + 0.5 : null,
			overflowsList: list ? r.right > list.right + 0.5 : null
		};
	});
	console.log('rename:', JSON.stringify(st));
	await el.screenshot({ path: OUT + 'layers-rename.png' });
}

// And confirm a TEXT layer refuses to rename.
const textRefused = await page.evaluate(() => {
	const rows = [...document.querySelectorAll('.layer-row')];
	const textRow = rows.find((r) => {
		const n = r.querySelector('.layer-name');
		return n && !n.classList.contains('renameable');
	});
	return { anyNonRenameable: !!textRow };
});
console.log('non-renameable present:', JSON.stringify(textRefused));

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
