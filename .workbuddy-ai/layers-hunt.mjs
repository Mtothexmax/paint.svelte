// Which element actually overflows when the rename editor opens?
// Reports every node in the sidebar whose scrollWidth exceeds its clientWidth.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: false,
	defaultViewport: null,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1400,900']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
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
await page.evaluate(() => {
	const b = [...document.querySelectorAll('button')].find((x) => x.title === 'Add layer');
	for (let i = 0; i < 14; i++) b?.click();
});
await new Promise((r) => setTimeout(r, 1200));

const hunt = () =>
	page.evaluate(() => {
		const root = document.querySelector('.sidebar-col') || document.body;
		const bad = [];
		for (const el of root.querySelectorAll('*')) {
			const cs = getComputedStyle(el);
			const scrollable = cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowX === 'hidden';
			if (!scrollable) continue;
			if (el.scrollWidth > el.clientWidth + 0.5) {
				bad.push({
					cls: (el.className || el.tagName).toString().slice(0, 40),
					scrollWidth: el.scrollWidth,
					clientWidth: el.clientWidth,
					over: el.scrollWidth - el.clientWidth,
					overflowX: cs.overflowX
				});
			}
		}
		return bad;
	});

console.log('idle   overflow:', JSON.stringify(await hunt()));

// Open the editor on the first row.
await page.evaluate(() => document.querySelectorAll('.layer-name')[0].click());
await new Promise((r) => setTimeout(r, 500));
console.log('editing overflow:', JSON.stringify(await hunt()));

// Also try with the OLD input rule (flex-basis auto / width auto).
await page.evaluate(() => {
	const s = document.createElement('style');
	s.textContent = `.layer-rename { flex: 1 1 auto !important; width: auto !important; }`;
	document.head.appendChild(s);
});
await new Promise((r) => setTimeout(r, 400));
console.log('old-css overflow:', JSON.stringify(await hunt()));

const inputInfo = await page.evaluate(() => {
	const i = document.querySelector('.layer-rename');
	if (!i) return null;
	const cs = getComputedStyle(i);
	return {
		w: Math.round(i.getBoundingClientRect().width),
		scrollWidth: i.scrollWidth,
		clientWidth: i.clientWidth,
		minWidth: cs.minWidth,
		flexBasis: cs.flexBasis,
		boxSizing: cs.boxSizing,
		size: i.getAttribute('size')
	};
});
console.log('input:', JSON.stringify(inputInfo));
await browser.close();
