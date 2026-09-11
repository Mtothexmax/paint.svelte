// Move Selected Pixels: the Rotate / Distort options must expose Apply + Cancel
// in the options strip, wired to the floating transform session.
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

const clickTool = async (label) => {
	const ok = await page.evaluate((l) => {
		const b = document.querySelector(`button[aria-label="${l}"]`);
		if (!b) return false;
		b.click();
		return true;
	}, label);
	await new Promise((r) => setTimeout(r, 350));
	if (!ok) throw new Error('tool button not found: ' + label);
};

const seg = async (label) => {
	const ok = await page.evaluate((l) => {
		const b = [...document.querySelectorAll('.seg-btn')].find((x) => (x.textContent ?? '').includes(l));
		if (!b) return false;
		b.click();
		return true;
	}, label);
	await new Promise((r) => setTimeout(r, 350));
	return ok;
};

const buttons = () =>
	page.evaluate(() => {
		const all = [...document.querySelectorAll('.mini-btn')];
		const pick = (t) => {
			const b = all.find((x) => (x.textContent ?? '').includes(t));
			return b ? { present: true, disabled: b.disabled } : { present: false };
		};
		return {
			apply: pick('Apply'),
			cancel: pick('Cancel'),
			labels: all.map((b) => b.textContent.trim().replace(/\s+/g, ' '))
		};
	});

const history = () =>
	page.evaluate(() => {
		const t = [...document.querySelectorAll('.panel-title')].find((e) => /history/i.test(e.textContent));
		const card = t?.closest('.panel-card');
		return card ? card.innerText.replace(/\s+/g, ' ').slice(0, 160) : null;
	});

// 1. rectangle selection
await clickTool('Rectangle Select');
await page.mouse.move(560, 400);
await page.mouse.down();
await page.mouse.move(760, 540, { steps: 12 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 400));
console.log('selection made :', JSON.stringify(await buttons()));

// 2. move-pixels + Rotate
await clickTool('Move Selected Pixels');
console.log('rotate seg     :', await seg('Rotate'));
console.log('mode=rotate    :', JSON.stringify(await buttons()));

// 3. lift the pixels by dragging inside the selection
await page.mouse.move(660, 470);
await page.mouse.down();
await page.mouse.move(700, 500, { steps: 10 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 500));
const lifted = await buttons();
console.log('after drag     :', JSON.stringify(lifted));

const beforeApply = await history();

// 4. Apply
const applied = await page.evaluate(() => {
	const b = [...document.querySelectorAll('.mini-btn')].find((x) => (x.textContent ?? '').includes('Apply'));
	if (!b || b.disabled) return false;
	b.click();
	return true;
});
await new Promise((r) => setTimeout(r, 700));
console.log('apply clicked  :', applied);
console.log('after apply    :', JSON.stringify(await buttons()));
const afterApply = await history();
console.log('history before :', beforeApply);
console.log('history after  :', afterApply);

// 5. Distort mode + a second session, then Cancel
console.log('distort seg    :', await seg('Distort'));
await page.mouse.move(660, 470);
await page.mouse.down();
await page.mouse.move(680, 490, { steps: 8 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 500));
console.log('distort lifted :', JSON.stringify(await buttons()));
const cancelled = await page.evaluate(() => {
	const b = [...document.querySelectorAll('.mini-btn')].find((x) => (x.textContent ?? '').includes('Cancel'));
	if (!b || b.disabled) return false;
	b.click();
	return true;
});
await new Promise((r) => setTimeout(r, 700));
console.log('cancel clicked :', cancelled);
console.log('after cancel   :', JSON.stringify(await buttons()));
console.log('history final  :', await history());

// 6. Move mode should NOT offer Apply
console.log('move seg       :', await seg('Move'));
console.log('mode=move      :', JSON.stringify(await buttons()));

console.log('\nerrors:', errors.length ? errors : 'none');
await browser.close();
