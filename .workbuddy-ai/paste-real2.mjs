// End-to-end: a REAL image on the OS clipboard + a REAL Ctrl+V, in a real
// (headed) window, against the running app. This is the Paint.NET scenario.
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: false,
	defaultViewport: null,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1400,900']
});
const page = await browser.newPage();
const cdp = await page.target().createCDPSession();
await cdp.send('Browser.grantPermissions', {
	origin: URL,
	permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite']
});
const errors = [];
page.on('console', (m) => {
	if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 3000));

const clickByText = async (text) => {
	const ok = await page.evaluate((t) => {
		const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').includes(t));
		if (!b) return false;
		b.click();
		return true;
	}, text);
	if (!ok) throw new Error('button not found: ' + text);
	await new Promise((r) => setTimeout(r, 400));
};

// Fresh 800x600 document so the oversize path is easy to trigger.
await clickByText('New…');
await new Promise((r) => setTimeout(r, 600));
await clickByText('SVGA');
await new Promise((r) => setTimeout(r, 400));
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1800));

const layerCount = () => page.evaluate(() => document.querySelectorAll('[class*=layer-]').length);
const canvasSize = () =>
	page.evaluate(() => {
		const el = [...document.querySelectorAll('*')].find((e) => /^\s*\d+\s*×\s*\d+\s*$/.test(e.textContent ?? ''));
		return (el?.textContent ?? '').replace(/\s+/g, '') || null;
	});
const dialogOpen = () =>
	page.evaluate(() => !!document.querySelector('[class*=m-body]') && /larger than the canvas/i.test(document.body.innerText || ''));

async function writeOnce(w, h) {
	return page.evaluate(async ({ w, h }) => {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		const g = c.getContext('2d');
		g.fillStyle = '#ff0000';
		g.fillRect(0, 0, c.width, c.height);
		g.fillStyle = '#00ff00';
		g.fillRect(0, 0, c.width / 2, c.height / 2);
		const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
		try {
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
			return { ok: true, bytes: blob.size, w, h };
		} catch (e) {
			return { ok: false, error: String(e) };
		}
	}, { w, h });
}

// The OS refuses clipboard writes when the window is not the foreground one;
// nudge it and retry (harness concern, not app behaviour).
async function seedOsClipboard(w, h) {
	let res = null;
	for (let i = 0; i < 4; i++) {
		res = await writeOnce(w, h);
		if (res.ok) return res;
		await page.bringToFront();
		await page.mouse.click(700, 500);
		await new Promise((r) => setTimeout(r, 600));
	}
	throw new Error('seed failed: ' + JSON.stringify(res));
}

async function ctrlV() {
	const m = 2;
	await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers: m, key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers: m, key: 'v', code: 'KeyV', windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86, text: '' });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: m, key: 'v', code: 'KeyV', windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86 });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 0, key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 });
}

// Click somewhere harmless on the canvas so focus is NOT on the seed button.
async function focusCanvas() {
	await page.mouse.click(700, 500);
	await new Promise((r) => setTimeout(r, 200));
}

const activeEl = () =>
	page.evaluate(() => {
		const a = document.activeElement;
		return a ? a.tagName + (a.id ? '#' + a.id : '') : null;
	});

console.log('start      : size=%s layers=%d active=%s', await canvasSize(), await layerCount(), await activeEl());

// ---- TEST 1: small image, OS clipboard only (no in-app copy yet) ----
await seedOsClipboard(300, 200);
await focusCanvas();
await ctrlV();
await new Promise((r) => setTimeout(r, 1200));
console.log('T1 small   : size=%s layers=%d dialog=%s', await canvasSize(), await layerCount(), await dialogOpen());

// ---- TEST 2: in-app copy first (internal clipboard now NON-empty), then a
// ---- REAL OS image. This is the case that used to paste the stale copy. ----
await focusCanvas();
await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers: 2, key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 });
for (const [key, code, vk, text] of [['a', 'KeyA', 65, ''], ['c', 'KeyC', 67, '']]) {
	await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers: 2, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text });
	await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 2, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
	await new Promise((r) => setTimeout(r, 400));
}
await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 0, key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 });
await new Promise((r) => setTimeout(r, 600));
console.log('after copy : layers=%d', await layerCount());

// Now a big OS image (1600x900) -> should trigger the oversize dialog.
await seedOsClipboard(1600, 900);
await focusCanvas();
await ctrlV();
await new Promise((r) => setTimeout(r, 1500));
console.log('T2 oversize: size=%s layers=%d dialog=%s', await canvasSize(), await layerCount(), await dialogOpen());

// Answer "Expand Canvas".
await clickByText('Expand Canvas');
await new Promise((r) => setTimeout(r, 1200));
console.log('T2 expand  : size=%s layers=%d', await canvasSize(), await layerCount());

// ---- TEST 3: oversized OS image -> "Keep Canvas Size" (canvas stays 1600x900) ----
await seedOsClipboard(2000, 1200);
await focusCanvas();
await ctrlV();
await new Promise((r) => setTimeout(r, 1500));
const before3 = await layerCount();
console.log('T3 oversize  : size=%s layers=%d dialog=%s', await canvasSize(), before3, await dialogOpen());
await clickByText('Keep Canvas Size');
await new Promise((r) => setTimeout(r, 1200));
console.log('T3 keep      : size=%s layers=%d (was %d)', await canvasSize(), await layerCount(), before3);

// ---- TEST 4: oversized OS image -> "Cancel" (nothing happens) ----
await seedOsClipboard(2400, 1400);
await focusCanvas();
await ctrlV();
await new Promise((r) => setTimeout(r, 1500));
const before4 = await layerCount();
console.log('T4 oversize  : size=%s layers=%d dialog=%s', await canvasSize(), before4, await dialogOpen());
await clickByText('Cancel');
await new Promise((r) => setTimeout(r, 1200));
console.log('T4 cancel    : size=%s layers=%d (was %d)', await canvasSize(), await layerCount(), before4);

console.log('\nconsole errors:', errors.length ? errors : 'none');
await browser.close();
