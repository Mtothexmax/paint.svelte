// Does clicking a layer name really open a FOCUSED, contained editor?
// (The hidden paste catcher steals focus from non-editable targets, so this
// needs verifying.)
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});

async function run(width, height, label) {
	const page = await browser.newPage();
	await page.setViewport({ width, height, deviceScaleFactor: 2 });
	const errors = [];
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(m.text());
	});
	page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
	await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
	await new Promise((r) => setTimeout(r, 2200));

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

	const names = await page.$$('.layer-name');
	await names[0].click();
	await new Promise((r) => setTimeout(r, 400));

	const after = await page.evaluate(() => {
		const inp = document.querySelector('.layer-rename');
		if (!inp) return { open: false };
		const a = document.activeElement;
		const r = inp.getBoundingClientRect();
		const row = inp.closest('.layer-row').getBoundingClientRect();
		const list = inp.closest('.layer-list').getBoundingClientRect();
		return {
			open: true,
			focused: a === inp,
			activeTag: a ? a.tagName : null,
			inputRect: { x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width) },
			rowRect: { x: Math.round(row.x), right: Math.round(row.right) },
			listRect: { x: Math.round(list.x), right: Math.round(list.right) },
			overflowRight: Math.round(r.right - row.right),
			overflowLeft: Math.round(row.x - r.x)
		};
	});

	// Type into it — does the text actually land in the field?
	await page.keyboard.type('Renamed');
	await new Promise((r) => setTimeout(r, 300));
	const typed = await page.evaluate(() => {
		const inp = document.querySelector('.layer-rename');
		const catcher = document.querySelector('textarea[tabindex="-1"]');
		return { inputValue: inp ? inp.value : null, catcherValue: catcher ? catcher.value : null };
	});
	console.log(`\n=== ${label} (${width}x${height}) ===`);
	console.log('rename :', JSON.stringify(after));
	console.log('typed  :', JSON.stringify(typed));
	console.log('errors :', errors.length ? errors : 'none');

	await page.close();
}

//await run(1400, 900, 'normal');
await run(1000, 700, 'narrow');
await run(820, 640, 'tiny');
await browser.close();
