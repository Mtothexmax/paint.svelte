// Verify the Resize Image dialog's new width/height lock:
//   checkbox gone, lock toggle present + tinted, ratio enforced, unlock frees
//   the fields, re-locking re-syncs, and the toggle lines up with the inputs.
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
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));

// Open Resize Image via the status-bar image-size button.
await page.evaluate(() => document.querySelector('.status-dim')?.click());
await new Promise((r) => setTimeout(r, 700));

/** Type into one of the .dims number inputs (0 = width, 1 = height). */
const setDim = (idx, val) =>
	page.evaluate(
		(i, v) => {
			const el = document.querySelectorAll('.dims input')[i];
			const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
			setter.call(el, String(v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		},
		idx,
		val
	);

const readDims = () =>
	page.evaluate(() => {
		const ins = [...document.querySelectorAll('.dims input')];
		const lock = document.querySelector('.lock-btn');
		const svg = lock?.querySelector('svg');
		const box = (n) => {
			const r = n.getBoundingClientRect();
			return {
				top: Math.round(r.top),
				bottom: Math.round(r.bottom),
				left: Math.round(r.left),
				right: Math.round(r.right),
				w: Math.round(r.width),
				h: Math.round(r.height)
			};
		};
		const rows = [...document.querySelectorAll('.dims')];
		const scaleIn = rows[1]?.querySelector('input');
		return {
			w: ins[0].value,
			h: ins[1].value,
			pct: scaleIn?.value,
			lockPresent: !!lock,
			lockPressed: lock?.getAttribute('aria-pressed'),
			lockLabel: lock?.getAttribute('aria-label'),
			lockTitle: lock?.getAttribute('title'),
			lockBg: lock ? getComputedStyle(lock).backgroundColor : null,
			svgFill: svg ? getComputedStyle(svg).fill : null,
			svgW: svg ? Math.round(svg.getBoundingClientRect().width) : null,
			// the lock glyph must actually render (path present in the DOM)
			pathLen: svg?.querySelector('path')?.getAttribute('d')?.length ?? 0,
			lockBox: lock ? box(lock) : null,
			wBox: box(ins[0]),
			hBox: box(ins[1]),
			scaleBox: scaleIn ? box(scaleIn) : null,
			// scoped to the dialog: the layers panel has its own checkboxes
			oldCheckbox: [...document.querySelectorAll('.dialog input[type=checkbox]')].length,
			pageCheckboxes: [...document.querySelectorAll('input[type=checkbox]')].length,
			labelText: (document.querySelector('.dialog')?.textContent ?? '')
				.replace(/\s+/g, ' ')
				.trim()
				.slice(0, 120)
		};
	});

const initial = await readDims();
await page.screenshot({ path: `${OUT}resize-lock-on.png`, clip: await page.$('.dialog').then((d) => d.boundingBox()) });

// Locked: width 400 -> height must follow the 800x600 (4:3) ratio => 300
await setDim(0, 400);
await new Promise((r) => setTimeout(r, 250));
const lockedWidth = await readDims();

// Unlock, then a height change must NOT touch the width
await page.evaluate(() => document.querySelector('.lock-btn')?.click());
await new Promise((r) => setTimeout(r, 250));
const afterUnlock = await readDims();
await setDim(1, 500);
await new Promise((r) => setTimeout(r, 250));
const unlockedHeight = await readDims();
await page.screenshot({ path: `${OUT}resize-lock-off.png`, clip: await page.$('.dialog').then((d) => d.boundingBox()) });

// Re-lock: height was edited last, so the WIDTH must snap back to 500*800/600 = 667
await page.evaluate(() => document.querySelector('.lock-btn')?.click());
await new Promise((r) => setTimeout(r, 250));
const relocked = await readDims();

// Canvas Size mode: the anchor grid must still render under the new rows.
await page.evaluate(() => {
	const b = [...document.querySelectorAll('.seg-btn')].find((x) => x.textContent.includes('Canvas size'));
	b?.click();
});
await new Promise((r) => setTimeout(r, 400));
const canvasMode = await page.evaluate(() => {
	const d = document.querySelector('.dialog');
	return {
		title: d.querySelector('.dialog-title').textContent.trim(),
		anchors: d.querySelectorAll('.anchor-cell').length,
		lockPresent: !!d.querySelector('.lock-btn'),
		checkboxes: d.querySelectorAll('input[type=checkbox]').length
	};
});
await page.screenshot({ path: `${OUT}resize-canvas-mode.png`, clip: await page.$('.dialog').then((d) => d.boundingBox()) });

await page.keyboard.press('Escape');
await new Promise((r) => setTimeout(r, 400));
await browser.close();

console.log('--- initial ---');
console.log(`  w x h            : ${initial.w} x ${initial.h}   scale ${initial.pct}%`);
console.log(`  dialog checkboxes: ${initial.oldCheckbox}  (page-wide: ${initial.pageCheckboxes})`);
console.log(`  lock button      : present=${initial.lockPresent} pressed=${initial.lockPressed}`);
console.log(`  aria-label       : ${initial.lockLabel}`);
console.log(`  title            : ${initial.lockTitle}`);
console.log(`  icon fill        : ${initial.svgFill}  size=${initial.svgW}px  pathChars=${initial.pathLen}`);
console.log(`  lock bg (on)     : ${initial.lockBg}`);
console.log(`  bottoms          : lock=${initial.lockBox.bottom} w=${initial.wBox.bottom} h=${initial.hBox.bottom}`);
console.log(
	`  field widths     : w=${initial.wBox.w} h=${initial.hBox.w} scale=${initial.scaleBox.w} ` +
		`| scale left ${initial.scaleBox.left} vs width left ${initial.wBox.left}`
);
console.log('--- locked: width -> 400 ---');
console.log(`  w x h            : ${lockedWidth.w} x ${lockedWidth.h}   (expect 400 x 300)`);
console.log('--- unlock, height -> 500 ---');
console.log(`  after unlock     : ${afterUnlock.w} x ${afterUnlock.h}  pressed=${afterUnlock.lockPressed} fill=${afterUnlock.svgFill}`);
console.log(`  w x h            : ${unlockedHeight.w} x ${unlockedHeight.h}   (expect 400 x 500)`);
console.log('--- re-lock (height edited last) ---');
console.log(`  w x h            : ${relocked.w} x ${relocked.h}   (expect 667 x 500)`);
console.log(`  pressed=${relocked.lockPressed} fill=${relocked.svgFill} bg=${relocked.lockBg}`);
console.log('--- canvas size mode ---');
console.log(
	`  title="${canvasMode.title}" anchors=${canvasMode.anchors} lock=${canvasMode.lockPresent} checkboxes=${canvasMode.checkboxes}`
);
console.log(`dialog text        : ${initial.labelText}`);
console.log(`errors             : ${errors.length ? errors.join(' | ') : 'none'}`);
