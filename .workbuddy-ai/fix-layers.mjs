// Measure the "Layers" title's text ink against the glyph ink of the icon
// buttons beside it. The title carries bottom padding + a border + a margin,
// so its BOX centre sits below its TEXT centre — which is what makes the
// buttons read as "a bit below".
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/paint.svelte/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';
const TAG = process.argv[2] ?? 'before';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
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

const m = await page.evaluate(() => {
	// The Layers panel specifically (History has a .panel-title too).
	const title = [...document.querySelectorAll('.panel-title')].find((t) => t.textContent.trim() === 'Layers');
	if (!title) return { found: false };
	const row = title.parentElement;
	const buttons = [...row.querySelectorAll('.mini-btn')];
	const inkOf = (el) => {
		const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
		if (!node) return null;
		const r = document.createRange();
		r.selectNodeContents(node);
		const b = r.getBoundingClientRect();
		return { cy: +((b.top + b.bottom) / 2).toFixed(2), top: +b.top.toFixed(2), bottom: +b.bottom.toFixed(2) };
	};
	const tr = title.getBoundingClientRect();
	const cs = getComputedStyle(title);
	const rc = getComputedStyle(row);
	return {
		found: true,
		row: { top: +row.getBoundingClientRect().top.toFixed(2), bottom: +row.getBoundingClientRect().bottom.toFixed(2), h: +row.getBoundingClientRect().height.toFixed(2), align: rc.alignItems },
		title: {
			boxCy: +((tr.top + tr.bottom) / 2).toFixed(2),
			boxTop: +tr.top.toFixed(2),
			boxBottom: +tr.bottom.toFixed(2),
			h: +tr.height.toFixed(2),
			pad: cs.padding,
			mar: cs.margin,
			border: cs.borderBottomWidth,
			font: `${cs.fontSize}/${cs.lineHeight}`
		},
		titleInk: inkOf(title),
		buttons: buttons.map((b) => {
			const br = b.getBoundingClientRect();
			const bcs = getComputedStyle(b);
			return {
				glyph: b.textContent.trim(),
				boxCy: +((br.top + br.bottom) / 2).toFixed(2),
				h: +br.height.toFixed(2),
				pad: bcs.padding,
				font: `${bcs.fontSize}/${bcs.lineHeight}`,
				ink: inkOf(b)
			};
		})
	};
});

console.log(`=== Layers header (${TAG}) ===`);
if (!m.found) {
	console.log('  Layers panel not found');
} else {
	console.log(`row        : align-items=${m.row.align}  box ${m.row.top}..${m.row.bottom} h=${m.row.h}`);
	console.log(`title box  : ${m.title.boxTop}..${m.title.boxBottom} h=${m.title.h} cy=${m.title.boxCy}  font=${m.title.font}`);
	console.log(`             padding=${m.title.pad} margin=${m.title.mar} borderBottom=${m.title.border}`);
	console.log(`title ink  : cy=${m.titleInk.cy}`);
	for (const b of m.buttons) {
		console.log(
			`  btn ${b.glyph.padEnd(2)} box h=${String(b.h).padStart(5)} cy=${String(b.boxCy).padStart(7)} ink cy=${String(b.ink?.cy).padStart(7)}  offset vs title ink = ${(b.ink.cy - m.titleInk.cy).toFixed(2)}`
		);
	}
	const offs = m.buttons.map((b) => +(b.ink.cy - m.titleInk.cy).toFixed(2));
	const spread = Math.max(...offs) - Math.min(...offs);
	console.log(`offsets: min=${Math.min(...offs)} max=${Math.max(...offs)} spread=${spread.toFixed(2)}`);
	console.log(`box-centre vs text-centre delta on the title: ${(m.title.boxCy - m.titleInk.cy).toFixed(2)}`);
}

const crop = await page.evaluate(() => {
	const t = [...document.querySelectorAll('.panel-title')].find((x) => x.textContent.trim() === 'Layers');
	const card = t.closest('.panel-card');
	const r = card.getBoundingClientRect();
	return { x: Math.round(r.x) - 4, y: Math.round(r.y) - 4, width: Math.round(r.width) + 8, height: 60 };
});
await page.screenshot({ path: `${OUT}fix-layers-${TAG}.png`, clip: crop });
console.log(`saved fix-layers-${TAG}.png`);
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
