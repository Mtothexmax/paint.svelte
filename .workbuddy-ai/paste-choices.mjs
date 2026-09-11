// Verify all three paste-dialog answers on the same small canvas.
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

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const clickByText = async (text) => {
	const ok = await page.evaluate((t) => {
		const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').includes(t));
		if (!b) return false;
		b.click();
		return true;
	}, text);
	if (!ok) throw new Error('button not found: ' + text);
	await new Promise((r) => setTimeout(r, 300));
};

// Open New..., preset SVGA, then Create.
await clickByText('New…');
await new Promise((r) => setTimeout(r, 500));
await clickByText('SVGA');
await new Promise((r) => setTimeout(r, 300));
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1500));

const sizeIn = async () =>
	page.evaluate(() => {
		const el = [...document.querySelectorAll('*')].find((e) => /^\s*\d+\s*×\s*\d+\s*$/.test(e.textContent ?? ''));
		const t = (el?.textContent ?? '').replace(/\s+/g, '').replace('×', ' x ');
		return t || null;
	});
const layerCount = () =>
	page.evaluate(() => document.querySelectorAll('[class*=layer-]').length);

const pasteImage = async (w, h) => {
	await page.evaluate(
		async ({ w, h }) => {
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			const ctx = c.getContext('2d');
			ctx.fillStyle = '#ff0000';
			ctx.fillRect(0, 0, 64, 64);
			ctx.fillStyle = '#00ff00';
			ctx.fillRect(w - 64, h - 64, 64, 64);
			ctx.fillStyle = 'rgba(0,0,255,0.5)';
			ctx.fillRect(64, 64, w - 128, h - 128);
			const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
			const file = new File([blob], 'p.png', { type: 'image/png' });
			const dt = new DataTransfer();
			dt.items.add(file);
			document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
		},
		{ w, h }
	);
	await new Promise((r) => setTimeout(r, 800));
};

const pickButton = (text) =>
	page.evaluate((t) => {
		const b = [...document.querySelectorAll('.pd-choice')].find((x) => x.textContent.includes(t));
		b?.click();
		return !!b;
	}, text);

console.log('canvas on open:', await sizeIn());
const baseLayers = await layerCount();

for (const choice of ['Cancel', 'Keep Canvas Size', 'Expand Canvas']) {
	const before = { size: await sizeIn(), layers: await layerCount() };
	await pasteImage(1600, 900);
	const dlg = await page.evaluate(() => !!document.querySelector('.m-dialog'));
	if (!dlg) throw new Error(`expected dialog for ${choice}, none opened`);
	const clicked = await pickButton(choice);
	if (!clicked) throw new Error(`button not found: ${choice}`);
	await new Promise((r) => setTimeout(r, 1000));
	const after = { size: await sizeIn(), layers: await layerCount() };
	console.log(
		`${choice.padEnd(18)} before=${JSON.stringify(before)} after=${JSON.stringify(after)}`
	);
}

console.log('console errors:', errors.length ? JSON.stringify(errors.slice(0, 8), null, 1) : 'none');
await page.screenshot({ path: '.workbuddy-ai/paste-final.png' });
await browser.close();