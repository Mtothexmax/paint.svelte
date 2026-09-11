// Color Picker: custom pipette cursor + live RGB/alpha HUD that reports the
// composited pixel under the pointer.
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
await new Promise((r) => setTimeout(r, 1600));

// Known opaque fill: Backspace fills the layer with the foreground colour.
const fg = await page.evaluate(() => {
	const b = [...document.querySelectorAll('button')].find((x) => (x.title ?? '').startsWith('Foreground colour'));
	if (!b) return null;
	const inner = b.querySelector('*') || b;
	const cs = getComputedStyle(inner);
	return { title: b.title, bg: cs.backgroundColor };
});
console.log('foreground swatch :', JSON.stringify(fg));

await page.mouse.move(650, 450);
await page.keyboard.press('Backspace');
await new Promise((r) => setTimeout(r, 900));

const clickTool = async (label) => {
	const ok = await page.evaluate((l) => {
		const b = document.querySelector(`button[aria-label="${l}"]`);
		if (!b) return false;
		b.click();
		return true;
	}, label);
	await new Promise((r) => setTimeout(r, 400));
	return ok;
};
console.log('color picker tool :', await clickTool('Color Picker'));

const hud = () =>
	page.evaluate(() => {
		const el = document.querySelector('.probe-hud');
		if (!el) return { present: false };
		const sw = el.querySelector('.probe-fill');
		return {
			present: true,
			text: el.innerText.replace(/\s+/g, ' ').trim(),
			swatch: sw ? getComputedStyle(sw).backgroundColor : null,
			rect: (() => {
				const r = el.getBoundingClientRect();
				return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
			})()
		};
	});

const cursor = () =>
	page.evaluate(() => {
		const host = document.querySelector('canvas')?.parentElement;
		return host ? getComputedStyle(host).cursor : null;
	});

// 1. hover the middle of the document (filled with the foreground colour)
await page.mouse.move(640, 440);
await new Promise((r) => setTimeout(r, 400));
console.log('\nhover inside      :', JSON.stringify(await hud()));
console.log('cursor            :', (await cursor())?.slice(0, 60));

// 2. hover a bit further away — the HUD should trail the pointer
await page.mouse.move(760, 560);
await new Promise((r) => setTimeout(r, 400));
console.log('hover moved       :', JSON.stringify(await hud()));

// 3. hover outside the document (top-left of the canvas viewport, above the doc)
await page.mouse.move(120, 180);
await new Promise((r) => setTimeout(r, 400));
console.log('hover outside doc :', JSON.stringify(await hud()));

// 4. click to sample — notice must match the fill colour
await page.mouse.move(640, 440);
await new Promise((r) => setTimeout(r, 200));
await page.mouse.down();
await page.mouse.up();
await new Promise((r) => setTimeout(r, 600));
const notice = await page.evaluate(() => {
	const el = [...document.querySelectorAll('*')].find(
		(e) => e.children.length === 0 && /^(Foreground|Background) #/.test((e.textContent ?? '').trim())
	);
	return el ? el.textContent.trim() : null;
});
console.log('click notice      :', notice);

// 5. switching tools must remove the HUD and the custom cursor
await clickTool('Paintbrush');
await new Promise((r) => setTimeout(r, 300));
await page.mouse.move(700, 500);
await new Promise((r) => setTimeout(r, 300));
console.log('\nafter tool switch :', JSON.stringify(await hud()));
console.log('cursor            :', (await cursor())?.slice(0, 40));

console.log('\nerrors:', errors.length ? errors : 'none');
await browser.close();
