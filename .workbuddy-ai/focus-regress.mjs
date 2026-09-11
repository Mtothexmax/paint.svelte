// Regression: the hidden paste catcher must never steal typing from a real
// input (text tool draft, dialog number fields) and must stay empty.
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
const errors = [];
page.on('console', (m) => {
	if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await page.bringToFront();
await new Promise((r) => setTimeout(r, 3000));

const state = () =>
	page.evaluate(() => {
		const ta = document.querySelector('textarea[tabindex="-1"]');
		const a = document.activeElement;
		return {
			catcherEmpty: ta ? ta.value === '' : null,
			active: a ? a.tagName + (a.id ? '#' + a.id : '') + (a.className ? '.' + String(a.className).split(' ')[0] : '') : null,
			activeIsCatcher: ta ? a === ta : null
		};
	});

const clickByText = async (text) => {
	const ok = await page.evaluate((t) => {
		const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').includes(t));
		if (!b) return false;
		b.click();
		return true;
	}, text);
	await new Promise((r) => setTimeout(r, 500));
	return ok;
};
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1800));

console.log('load          :', JSON.stringify(await state()));

// --- typing random keys on the canvas must not accumulate anywhere ---
for (const k of ['b', 'p', 'x', 'd', 'Enter', 'Backspace']) {
	await page.keyboard.press(k);
	await new Promise((r) => setTimeout(r, 80));
}
console.log('after typing  :', JSON.stringify(await state()));

// --- the text tool draft must own the keyboard ---
const picked = await page.evaluate(() => {
	const b = [...document.querySelectorAll('button')].find((x) => (x.title ?? '').toLowerCase().includes('text'));
	if (!b) return false;
	b.click();
	return true;
});
console.log('text tool btn :', picked);
await new Promise((r) => setTimeout(r, 500));
await page.mouse.click(600, 450);
await new Promise((r) => setTimeout(r, 600));
await page.keyboard.type('Hello');
await new Promise((r) => setTimeout(r, 400));
console.log(
	'draft text    :',
	JSON.stringify(await page.evaluate(() => {
		const ta = [...document.querySelectorAll('textarea')].find((t) => !t.hasAttribute('tabindex'));
		return { value: ta ? ta.value : null, focused: ta ? document.activeElement === ta : null };
	}))
);
console.log('catcher       :', JSON.stringify(await state()));
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 400));

// --- a dialog input must own the keyboard ---
await page.evaluate(() => {
	const b = [...document.querySelectorAll('button')].find((x) => (x.textContent ?? '').includes('New…')) ||
		[...document.querySelectorAll('*')].find((x) => (x.textContent ?? '') === 'New…');
	b?.click();
});
await new Promise((r) => setTimeout(r, 800));
const dlg = await page.evaluate(() => {
	const inputs = [...document.querySelectorAll('input')].filter((i) => i.offsetParent !== null);
	return inputs.map((i) => ({ type: i.type, value: i.value, id: i.id }));
});
console.log('dialog inputs :', JSON.stringify(dlg));
if (dlg.length) {
	await page.evaluate(() => {
		const i = [...document.querySelectorAll('input')].filter((x) => x.offsetParent !== null)[0];
		i.focus();
	});
	await page.keyboard.down('Control');
	await page.keyboard.press('a');
	await page.keyboard.up('Control');
	await page.keyboard.type('1234');
	await new Promise((r) => setTimeout(r, 300));
	console.log(
		'typed in dlg  :',
		JSON.stringify(await page.evaluate(() => {
			const i = document.activeElement;
			return { tag: i.tagName, value: i.value };
		}))
	);
}
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 500));
console.log('after close   :', JSON.stringify(await state()));

console.log('\nconsole errors:', errors.length ? errors : 'none');
await browser.close();
