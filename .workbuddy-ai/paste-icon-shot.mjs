// Open the oversized-paste dialog and screenshot it so the new icons can be
// eyeballed. Synthetic ClipboardEvent is enough here — we only need the dialog.
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

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

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await new Promise((r) => setTimeout(r, 400));
};
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1500));

await page.evaluate(async () => {
	const c = document.createElement('canvas');
	c.width = 1600;
	c.height = 900;
	const g = c.getContext('2d');
	const grd = g.createLinearGradient(0, 0, 1600, 900);
	grd.addColorStop(0, '#ff5f6d');
	grd.addColorStop(1, '#2b6cff');
	g.fillStyle = grd;
	g.fillRect(0, 0, 1600, 900);
	g.fillStyle = 'rgba(255,255,255,0.85)';
	g.fillRect(200, 150, 500, 300);
	const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
	const dt = new DataTransfer();
	dt.items.add(new File([blob], 'p.png', { type: 'image/png' }));
	window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
});
await new Promise((r) => setTimeout(r, 1500));

const dlg = await page.$('.m-body');
const box = await page.evaluate(() => {
	const el = [...document.querySelectorAll('div')].find((d) => /larger than the canvas/i.test(d.innerText || ''));
	if (!el) return null;
	return { found: true, text: el.innerText.slice(0, 200) };
});
console.log('dialog text:', JSON.stringify(box));

// Screenshot the dialog window itself.
const win = await page.evaluate(() => {
	const el = document.querySelector('.m-body')?.closest('div[class*=m-win], .movable, section, div');
	return null;
});
const el = await page.$('[class*=pd-choices]');
if (el) {
	const parent = await page.evaluateHandle((n) => n.closest('div').parentElement.closest('div'), el);
	await parent.asElement()?.screenshot({ path: 'C:/dev/paint.svelte/.workbuddy-ai/paste-dialog.png' });
	console.log('screenshot: .workbuddy-ai/paste-dialog.png');
} else {
	console.log('pd-choices NOT FOUND');
}

console.log('errors:', errors.length ? errors : 'none');
await browser.close();
