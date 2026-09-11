// Alpha readout for a transparent doc + a screenshot of the HUD.
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
await new Promise((r) => setTimeout(r, 1600));

const clickTool = async (label) => {
	await page.evaluate((l) => document.querySelector(`button[aria-label="${l}"]`)?.click(), label);
	await new Promise((r) => setTimeout(r, 400));
};

const hud = () =>
	page.evaluate(() => {
		const el = document.querySelector('.probe-hud');
		if (!el) return { present: false };
		const sw = el.querySelector('.probe-fill');
		return { text: el.innerText.replace(/\s+/g, ' ').trim(), swatch: sw ? getComputedStyle(sw).backgroundColor : null };
	});

// --- 1. transparent document: alpha must read 0 ---
await clickTool('Color Picker');
await page.mouse.move(640, 440);
await new Promise((r) => setTimeout(r, 400));
console.log('transparent doc :', JSON.stringify(await hud()));

// --- 2. set a vivid foreground through the app's own store, fill, re-hover ---
const setOk = await page.evaluate(async () => {
	try {
		const ui = await import('/src/lib/state/ui.ts');
		ui.foregroundColor.set({ r: 59, g: 130, b: 246, a: 255 });
		return true;
	} catch (e) {
		return String(e);
	}
});
console.log('set foreground  :', setOk);
await page.mouse.move(640, 440);
await page.keyboard.press('Backspace');
await new Promise((r) => setTimeout(r, 900));
await page.mouse.move(600, 420);
await new Promise((r) => setTimeout(r, 400));
console.log('opaque fill     :', JSON.stringify(await hud()));

// screenshot: the canvas with the HUD visible
const host = await page.$('canvas');
const box = await host.boundingBox();
await page.screenshot({
	path: OUT + 'eyedropper-hud.png',
	clip: {
		x: Math.max(0, box.x + box.width / 2 - 260),
		y: Math.max(0, box.y + box.height / 2 - 160),
		width: 560,
		height: 320
	}
});
console.log('screenshot      : eyedropper-hud.png');
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
