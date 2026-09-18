// Visual evidence for the Highlights/Shadows fix: the dialog, then a bright
// base with Highlights +90 (brighter) and -90 (darker). Before the fix, -90
// rendered BRIGHTER than +90 because the shader's negative branch used -rgb.
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
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await sleep(450);
};
const openMenu = async (label) => {
	await page.evaluate((l) => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === l)?.click();
	}, label);
	await sleep(260);
};
const openLeaf = async (group, leaf) => {
	await openMenu(group === 'Adjustments' ? 'Adjustments' : 'Effects');
	if (group !== 'Adjustments') {
		await page.evaluate((t) => {
			[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes(t))?.click();
		}, group);
		await sleep(300);
	}
	const sel = group === 'Adjustments' ? '.menu-panel .menu-item' : '.sub-panel .menu-item';
	await page.evaluate(
		(arg) => {
			[...document.querySelectorAll(arg.sel)].find((x) => x.textContent.includes(arg.leaf))?.click();
		},
		{ sel, leaf }
	);
	for (let i = 0; i < 20; i++) {
		if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) {
			await sleep(600);
			return true;
		}
		await sleep(150);
	}
	return false;
};
const setSlider = async (i, v) => {
	await page.evaluate(
		(arg) => {
			const el = [...document.querySelectorAll('.m-dialog .fsl-range')][arg.i];
			if (!el) return;
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(arg.v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		},
		{ i, v }
	);
	await sleep(700);
};
const applyDialog = async () => {
	await page.evaluate(() => {
		const btn = [...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'));
		if (btn && !btn.disabled) btn.click();
	});
	await sleep(1200);
};
const undo = async () => {
	await page.keyboard.down('Control');
	await page.keyboard.press('z');
	await page.keyboard.up('Control');
	await sleep(900);
};

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1800);
const clip = await page.evaluate(() => {
	const b = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
});

await openLeaf('Render', 'Clouds');
await applyDialog();
await sleep(1000);
await page.screenshot({ path: OUT + 'hlsh-0-base.png', clip });
console.log('saved hlsh-0-base.png');

// Dialog shot (also proves both sliders exist and are labelled).
await openLeaf('Adjustments', 'Highlights / Shadows');
await setSlider(0, 90);
await page.screenshot({ path: OUT + 'hlsh-dialog.png' });
console.log('saved hlsh-dialog.png');
await applyDialog();
await page.screenshot({ path: OUT + 'hlsh-1-plus90.png', clip });
console.log('saved hlsh-1-plus90.png');
await page.keyboard.press('Escape');
await undo();

await openLeaf('Adjustments', 'Highlights / Shadows');
await setSlider(0, -90);
await setSlider(1, 0);
await applyDialog();
await page.screenshot({ path: OUT + 'hlsh-2-minus90.png', clip });
console.log('saved hlsh-2-minus90.png');
await page.keyboard.press('Escape');
await undo();

await browser.close();
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
process.exit(0);
