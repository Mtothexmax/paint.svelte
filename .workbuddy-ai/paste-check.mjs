// Smoke test for todo2: pasting must land at the TOP-LEFT, and an oversized
// paste must raise the Paint.NET-style choice dialog (with a preview).
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
const clickByTitle = async (title) => {
	const ok = await page.evaluate((t) => {
		const b = [...document.querySelectorAll('[title]')].find((x) => x.getAttribute('title') === t);
		if (!b) return false;
		b.click();
		return true;
	}, title);
	if (!ok) throw new Error('element not found by title: ' + title);
	await new Promise((r) => setTimeout(r, 300));
};

// --- open a small document -------------------------------------------------
await clickByText('New Full HD').catch(async () => {
	await clickByText('New…');
});
await new Promise((r) => setTimeout(r, 2000));
// Shrink the canvas so a paste from a big source is definitely oversized.
await page.evaluate(() => {
	// no-op placeholder: canvas stays 1920x1080, we paste a bigger bitmap below
});

// --- build an oversized image in the PAGE and paste it ---------------------
// Synthesise a 2600 x 1500 PNG, put it on the OS clipboard via the DataTransfer
// of a synthetic 'paste' event (the app's onPaste reads e.clipboardData.items).
const pasteImage = async (w, h) => {
	await page.evaluate(
		async ({ w, h }) => {
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			const ctx = c.getContext('2d');
			// Big obvious marker in the TOP-LEFT corner of the image.
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
	await new Promise((r) => setTimeout(r, 900));
};

// 1) oversized paste -> dialog must appear
await pasteImage(2600, 1500);
const dlg = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return null;
	return {
		title: d.querySelector('.m-title-text')?.textContent?.trim(),
		buttons: [...d.querySelectorAll('.pd-choice-title')].map((b) => b.textContent.trim()),
		hints: [...d.querySelectorAll('.pd-choice-hint')].map((b) => b.textContent.trim().replace(/\s+/g, ' ')),
		hasPreview: !!d.querySelector('.pd-preview img')?.getAttribute('src')?.startsWith('data:image/png'),
		previewPx: d.querySelector('.pd-preview img')?.getAttribute('src')?.length ?? 0,
		lead: d.querySelector('.pd-lead')?.textContent?.replace(/\s+/g, ' ').trim()
	};
});
console.log('OVERSIZE DIALOG:', JSON.stringify(dlg, null, 1));
await page.screenshot({ path: '.workbuddy-ai/paste-dialog.png' });

// 2) choose "Expand Canvas"
await page.evaluate(() => {
	const b = [...document.querySelectorAll('.pd-choice')].find((x) => x.textContent.includes('Expand Canvas'));
	b?.click();
});
await new Promise((r) => setTimeout(r, 1200));
const afterExpand = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	return { dialogStillOpen: !!d };
});
console.log('after Expand Canvas:', JSON.stringify(afterExpand));
await page.screenshot({ path: '.workbuddy-ai/paste-expanded.png' });

// 3) Cancel path: paste again, hit Cancel, nothing should change
await pasteImage(2600, 1500);
const opened2 = await page.evaluate(() => !!document.querySelector('.m-dialog'));
await page.evaluate(() => {
	const b = [...document.querySelectorAll('.pd-choice')].find((x) => x.textContent.includes('Cancel'));
	b?.click();
});
await new Promise((r) => setTimeout(r, 600));
console.log('second dialog opened:', opened2, 'closed after Cancel:', !(await page.evaluate(() => !!document.querySelector('.m-dialog'))));

// 4) small paste -> NO dialog, straight paste
await pasteImage(300, 200);
const dlg3 = await page.evaluate(() => !!document.querySelector('.m-dialog'));
console.log('small paste showed a dialog (should be false):', dlg3);
await page.screenshot({ path: '.workbuddy-ai/paste-small.png' });

console.log('console errors:', errors.length ? JSON.stringify(errors.slice(0, 8), null, 1) : 'none');
await browser.close();
