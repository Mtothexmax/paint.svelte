// Verify the Image ▸ Resize dialog is the non-modal, movable, closable one:
//  - opened as .m-dialog (MovableDialog), NOT a modal .dialog + backdrop
//  - the page behind it is NOT dimmed
//  - it has an X close button
//  - dragging the title bar moves it
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
const errors = [];
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

// open from the status-bar dimensions read-out
await page.evaluate(() => document.querySelector('button[title^="Image size"]')?.click());
await new Promise((r) => setTimeout(r, 600));

const opened = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	const modal = document.querySelector('.dialog-backdrop');
	const anyDialog = document.querySelector('.dialog');
	return {
		movable: !!d,
		label: d?.getAttribute('aria-label') ?? null,
		ariaModal: d?.getAttribute('aria-modal') ?? null,
		closeBtn: !!d?.querySelector('.m-close'),
		closeText: d?.querySelector('.m-close')?.textContent?.trim() ?? null,
		backdrop: !!modal,
		modalDialog: !!anyDialog,
		// is anything painted over the canvas that would darken it?
		overlays: [...document.querySelectorAll('body > div, body > section')].map((n) => {
			const s = getComputedStyle(n);
			return { cls: n.className.toString().slice(0, 60), bg: s.backgroundColor, pos: s.position, z: s.zIndex };
		})
	};
});
await page.screenshot({ path: `${OUT}resize-dialog.png` });

const box1 = await page.evaluate(() => {
	const r = document.querySelector('.m-dialog').getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
});

// drag by the title bar
const title = await page.evaluate(() => {
	const r = document.querySelector('.m-title').getBoundingClientRect();
	return { x: Math.round(r.x + 60), y: Math.round(r.y + r.height / 2) };
});
await page.mouse.move(title.x, title.y);
await page.mouse.down();
await page.mouse.move(title.x + 180, title.y + 120, { steps: 16 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 400));

const box2 = await page.evaluate(() => {
	const r = document.querySelector('.m-dialog').getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
});

// close with the X
await page.evaluate(() => document.querySelector('.m-close')?.click());
await new Promise((r) => setTimeout(r, 500));
const stillOpen = await page.evaluate(() => !!document.querySelector('.m-dialog'));

await browser.close();

console.log(JSON.stringify(opened, null, 1));
console.log(`\nbefore drag : x=${box1.x} y=${box1.y} w=${box1.w}`);
console.log(`after drag  : x=${box2.x} y=${box2.y} w=${box2.w}  (moved ${box2.x - box1.x}, ${box2.y - box1.y})`);
console.log(`closed by X : ${!stillOpen}`);

const checks = [
	['MovableDialog used', opened.movable],
	['aria-modal="false"', opened.ariaModal === 'false'],
	['X close button present', opened.closeBtn],
	['no modal backdrop', !opened.backdrop],
	['no .dialog wrapper (not the modal one)', !opened.modalDialog],
	['draggable by title', Math.abs(box2.x - box1.x) > 100 && Math.abs(box2.y - box1.y) > 60],
	['X closes it', !stillOpen]
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`\nerrors : ${errors.length ? errors.join(' | ') : 'none'}`);
