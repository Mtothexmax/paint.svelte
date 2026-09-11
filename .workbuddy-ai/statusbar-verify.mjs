// Verify the status-bar read-outs across their whole lifecycle:
//   mid-drag -> committed selection -> pointer leaves -> pointer returns ->
//   selection cleared -> image-size button still opens its dialog.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

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
await new Promise((r) => setTimeout(r, 1600));

/** Snapshot of the status strip: text plus which read-out icons are present. */
const snap = () =>
	page.evaluate(() => {
		const strip = document.querySelector('.status-strip');
		const which = [...strip.querySelectorAll('.sb-ic')].map((n) =>
			[...n.classList].find((c) => c !== 'sb-ic')
		);
		return {
			text: (strip.textContent ?? '').replace(/\s+/g, ' ').trim(),
			icons: which
		};
	});

await page.evaluate(() => document.querySelector('button[aria-label="Rectangle Select"]')?.click());
await new Promise((r) => setTimeout(r, 350));

// 1. mid-drag
await page.mouse.move(560, 400);
await page.mouse.down();
await page.mouse.move(760, 540, { steps: 12 });
await new Promise((r) => setTimeout(r, 400));
const midDrag = await snap();

// 2. committed
await page.mouse.up();
await new Promise((r) => setTimeout(r, 500));
const committed = await snap();

// 3. pointer leaves the canvas (up into the menu bar)
await page.mouse.move(700, 12, { steps: 8 });
await new Promise((r) => setTimeout(r, 400));
const left = await snap();

// 4. pointer returns
await page.mouse.move(600, 430, { steps: 8 });
await new Promise((r) => setTimeout(r, 400));
const back = await snap();

// 5. deselect (Ctrl+D) -> the selection read-out must disappear
await page.keyboard.down('Control');
await page.keyboard.press('d');
await page.keyboard.up('Control');
await new Promise((r) => setTimeout(r, 500));
const cleared = await snap();

// 6. the image-size read-out is still a working button
await page.evaluate(() => document.querySelector('.status-dim')?.click());
await new Promise((r) => setTimeout(r, 600));
const dialog = await page.evaluate(() => {
	const d = document.querySelector('.dlg, .dialog, [class*="dialog"]');
	return { open: !!d, title: d ? (d.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) : null };
});

await browser.close();

const show = (label, s) => {
	console.log(`${label.padEnd(18)}: ${s.text}`);
	console.log(`${''.padEnd(18)}  icons=[${s.icons.join(', ')}]`);
};
show('mid-drag', midDrag);
show('committed', committed);
show('pointer left', left);
show('pointer back', back);
show('sel cleared', cleared);
console.log(`image-size dialog : ${dialog.open ? `open ("${dialog.title}")` : 'NOT OPEN'}`);
console.log(`errors            : ${errors.length ? errors.join(' | ') : 'none'}`);
