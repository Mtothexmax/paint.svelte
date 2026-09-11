// Verify the selection-size popup opened from the status-bar read-out:
//   opens on click, pre-fills the live size, applies an exact size, clamps to
//   the canvas, Cancel/Escape are no-ops, and an ellipse selection stays an
//   ellipse (proved by pixel-sampling after Delete, not by reading the source).
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
await new Promise((r) => setTimeout(r, 2500));

const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await new Promise((r) => setTimeout(r, 450));
};
const newDoc = async () => {
	await clickByText('New…');
	await clickByText('SVGA');
	await clickByText('Create');
	await new Promise((r) => setTimeout(r, 1600));
};
await newDoc();

const pickTool = async (label) => {
	await page.evaluate((l) => document.querySelector(`button[aria-label="${l}"]`)?.click(), label);
	await new Promise((r) => setTimeout(r, 350));
};
const drag = async (x1, y1, x2, y2, steps = 12) => {
	await page.mouse.move(x1, y1);
	await page.mouse.down();
	await page.mouse.move(x2, y2, { steps });
	await page.mouse.up();
	await new Promise((r) => setTimeout(r, 450));
};

/** The selection read-out in the status bar. */
const selReadout = () =>
	page.evaluate(() => {
		const b = document.querySelector('.status-dim[title^="Selection size"]');
		return b ? { tag: b.tagName, text: b.textContent.trim(), title: b.getAttribute('title') } : null;
	});

const openPopup = async () => {
	await page.evaluate(() => document.querySelector('.status-dim[title^="Selection size"]')?.click());
	await new Promise((r) => setTimeout(r, 500));
};

/** Read the popup: presence, title, field values, hint line. */
const readPopup = () =>
	page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		if (!d) return { present: false };
		const ins = [...d.querySelectorAll('.ss-grid input')];
		return {
			present: true,
			title: d.querySelector('.m-title-text')?.textContent.trim(),
			ariaLabel: d.getAttribute('aria-label'),
			modal: d.getAttribute('aria-modal'),
			width: ins[0]?.value,
			height: ins[1]?.value,
			hint: d.querySelector('.ss-hint')?.textContent.replace(/\s+/g, ' ').trim(),
			focused: document.activeElement === ins[0] ? 'width' : document.activeElement?.tagName,
			actions: [...d.querySelectorAll('.m-footer button')].map((b) => b.textContent.trim())
		};
	});

const setField = (i, v) =>
	page.evaluate(
		(idx, val) => {
			const el = document.querySelectorAll('.ss-grid input')[idx];
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(val));
			el.dispatchEvent(new Event('input', { bubbles: true }));
		},
		i,
		v
	);

const clickAction = async (label) => {
	await page.evaluate((l) => {
		const b = [...document.querySelectorAll('.m-footer button')].find((x) => x.textContent.trim() === l);
		b?.click();
	}, label);
	await new Promise((r) => setTimeout(r, 550));
};

// ============ PART A — the popup ==========================================
await pickTool('Rectangle Select');
await drag(500, 330, 800, 560);

const readout = await selReadout();
await openPopup();
const opened = await readPopup();
await page.screenshot({ path: `${OUT}selection-size-popup.png` });

// Exact size.
await setField(0, 400);
await setField(1, 100);
const beforeApply = await readPopup();
await clickAction('Apply');
const afterApply = await selReadout();

// Reopen: must read back the LIVE selection, not the values we typed.
await openPopup();
const reopened = await readPopup();

// Clamp: ask for more than fits from the anchor.
await setField(0, 99999);
const clampedHint = await readPopup();
await page.screenshot({
	path: `${OUT}selection-size-clamped.png`,
	clip: await page.$('.m-dialog').then((d) => d.boundingBox())
});
await clickAction('Apply');
const afterClamp = await selReadout();

// Cancel must not change anything.
await openPopup();
await setField(0, 111);
await setField(1, 222);
await clickAction('Cancel');
const afterCancel = await selReadout();

// Escape must not change anything.
await openPopup();
await setField(0, 333);
await setField(1, 444);
await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 400));
const afterEscape = await selReadout();
const popupGone = await readPopup();

// ============ PART B — ellipse stays an ellipse ===========================
// Fill the layer, take an ELLIPSE selection, force a size through the popup,
// Delete, then sample a corner of the bounds: an ellipse leaves it untouched,
// a rectangle would have deleted it.
await page.evaluate(() => document.querySelector('button[aria-label="Paint Bucket"]')?.click());
await new Promise((r) => setTimeout(r, 300));
await page.mouse.move(650, 450);
await page.mouse.down();
await page.mouse.up();
await new Promise((r) => setTimeout(r, 800));

await pickTool('Ellipse Select');
await drag(520, 350, 720, 550);
await openPopup();
await setField(0, 200);
await setField(1, 200);
await clickAction('Apply');
const ellipseReadout = await selReadout();

// Delete the selected pixels.
await page.keyboard.press('Delete');
await new Promise((r) => setTimeout(r, 900));

// Sample just inside the bounds' top-left corner.
const sample = async (x, y) => {
	await pickTool('Color Picker');
	await page.mouse.move(x, y, { steps: 6 });
	await new Promise((r) => setTimeout(r, 450));
	const t = await page.evaluate(
		() => document.querySelector('.probe-hud')?.textContent.replace(/\s+/g, ' ').trim() ?? 'no hud'
	);
	await pickTool('Rectangle Select');
	return t;
};
const ellipseCorner = await sample(524, 354);
const ellipseCentre = await sample(620, 450);
await page.screenshot({ path: `${OUT}selection-size-ellipse.png` });

await browser.close();

const line = (l, v) => console.log(`${l.padEnd(22)}: ${v}`);
console.log('=== PART A — popup ===');
line('readout element', `${readout?.tag} "${readout?.text}"`);
line('popup opened', `${opened.present} title="${opened.title}" modal=${opened.modal}`);
line('prefilled w x h', `${opened.width} x ${opened.height}  (focused: ${opened.focused})`);
line('actions', JSON.stringify(opened.actions));
line('typed 400 x 100 -> hint', beforeApply.hint);
line('after Apply (readout)', afterApply?.text);
line('reopened reads back', `${reopened.width} x ${reopened.height}`);
line('typed 99999 -> hint', clampedHint.hint);
line('after clamped Apply', afterClamp?.text);
line('after Cancel', afterCancel?.text);
line('after Escape', `${afterEscape?.text}  popup present=${popupGone.present}`);
console.log('=== PART B — ellipse kind preserved ===');
line('ellipse after Apply', ellipseReadout?.text);
line('corner of bounds', ellipseCorner);
line('centre of bounds', ellipseCentre);
console.log(`errors                : ${errors.length ? errors.join(' | ') : 'none'}`);
