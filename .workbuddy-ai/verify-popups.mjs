// Post-palette regression pass: every popup surface, plus the z-order fix.
import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:5173/paint.svelte/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1500, height: 950, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickByText = async (t) => {
	await page.evaluate((x) => {
		[...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x))?.click();
	}, t);
	await sleep(500);
};

// --- 1. New Image modal (MovableDialog — the .m-dialog chrome plate) ------
await clickByText('New…');
await sleep(900);
const dlg = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return null;
	const cs = getComputedStyle(d);
	const t = d.querySelector('.m-title');
	return {
		bg: cs.backgroundColor,
		bgImg: cs.backgroundImage.slice(0, 70),
		border: cs.borderTopColor,
		radius: cs.borderRadius,
		titleBgImg: t ? getComputedStyle(t).backgroundImage.slice(0, 60) : null
	};
});
console.log(`.m-dialog  bg=${dlg?.bg}  img=${dlg?.bgImg}`);
console.log(`           border=${dlg?.border} radius=${dlg?.radius}`);
console.log(`           title img=${dlg?.titleBgImg}`);
await page.screenshot({ path: `${OUT}fx-newimage.png`, clip: await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	const r = d.getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
}) });
console.log('saved fx-newimage.png');
// Commit the dialog: without an active document the effect picks are no-ops
// (which is why the earlier run found no dialog at step 4).
await clickByText('SVGA');
await clickByText('Create');
await sleep(2000);

// --- 2. Menubar File dropdown (.menu-panel) --------------------------------
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'File')?.click();
});
await sleep(600);
const mp = await page.evaluate(() => {
	const m = document.querySelector('.menu-panel');
	if (!m) return null;
	const cs = getComputedStyle(m);
	const item = m.querySelector('.menu-item');
	const dis = m.querySelector('.menu-item.disabled');
	const sc = m.querySelector('.menu-shortcut');
	return {
		bg: cs.backgroundColor,
		bgImg: cs.backgroundImage.slice(0, 60),
		radius: cs.borderRadius,
		itemColor: item ? getComputedStyle(item).color : null,
		disabledColor: dis ? getComputedStyle(dis).color : null,
		shortcutColor: sc ? getComputedStyle(sc).color : null,
		rect: (() => { const r = m.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()
	};
});
console.log(`.menu-panel bg=${mp?.bg} r=${mp?.radius} item=${mp?.itemColor} disabled=${mp?.disabledColor} shortcut=${mp?.shortcutColor}`);
await page.screenshot({ path: `${OUT}fx-filemenu.png`, clip: { x: mp.rect.x, y: mp.rect.y, width: mp.rect.w, height: Math.min(mp.rect.h, 320) } });
console.log('saved fx-filemenu.png');
// Close it by toggling the same menubar button — an Escape + body click left
// the shell in a state where the next effect pick opened no dialog.
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'File')?.click();
});
await sleep(500);

// --- 3. Effects browser (menubar) ------------------------------------------
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
});
await sleep(800);
const fx = await page.evaluate(() => {
	const m = document.querySelector('.fx-add-menu');
	if (!m) return null;
	const cs = getComputedStyle(m);
	const head = m.querySelector('.fx-add-head');
	const item = m.querySelector('.fx-add-item');
	const sc = m.querySelector('.fx-add-search');
	return {
		bg: cs.backgroundColor,
		bgImg: cs.backgroundImage.slice(0, 60),
		z: cs.zIndex,
		headColor: head ? getComputedStyle(head).color : null,
		headBorder: head ? getComputedStyle(head).borderLeftColor : null,
		itemColor: item ? getComputedStyle(item).color : null,
		searchBg: sc ? getComputedStyle(sc).backgroundColor : null,
		rect: (() => { const r = m.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()
	};
});
console.log(`.fx-add-menu bg=${fx?.bg} z=${fx?.z}`);
console.log(`  head=${fx?.headColor} border=${fx?.headBorder} item=${fx?.itemColor} search=${fx?.searchBg}`);
await page.screenshot({ path: `${OUT}fx-browser.png`, clip: { x: fx.rect.x, y: fx.rect.y, width: fx.rect.w, height: Math.min(fx.rect.h, 520) } });
console.log('saved fx-browser.png');

// --- 4. Pick Gaussian Blur -> dialog, then open the switcher menu ----------
await page.evaluate(() => {
	const s = document.querySelector('.fx-add-search');
	if (s) {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, 'Gaussian Blur');
		s.dispatchEvent(new Event('input', { bubbles: true }));
	}
});
await sleep(500);
const picked = await page.evaluate(() => {
	const hit = [...document.querySelectorAll('.fx-add-item')].find((x) => x.textContent.includes('Gaussian Blur'));
	hit?.click();
	return {
		items: document.querySelectorAll('.fx-add-item').length,
		matched: !!hit,
		label: hit?.textContent?.trim() ?? null
	};
});
console.log(`effects browser after search: items=${picked.items} matched="${picked.label}"`);
await sleep(2200);
const zr = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return { found: false };
	const t = d.querySelector('.m-title');
	const sw = t.querySelector('.m-menu-btn');
	sw?.click();
	return { found: true, titleZ: getComputedStyle(t).zIndex, dialogZ: getComputedStyle(d).zIndex };
});
console.log(`dialog present: ${zr.found}`);
await sleep(800);
const zc = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return { found: false, reason: 'no dialog' };
	const m = d.querySelector('.fx-add-menu');
	if (!m) return { found: false, reason: 'dialog open but no switcher menu' };
	const mr = m.getBoundingClientRect();
	const dr = d.getBoundingClientRect();
	const x0 = Math.max(mr.left, dr.left), x1 = Math.min(mr.right, dr.right);
	const y0 = Math.max(mr.top, dr.top), y1 = Math.min(mr.bottom, dr.bottom);
	let over = 0, mine = 0;
	const kinds = new Set();
	for (let i = 1; i <= 6; i++)
		for (let j = 1; j <= 6; j++) {
			const x = Math.round(x0 + ((x1 - x0) * i) / 7);
			const y = Math.round(y0 + ((y1 - y0) * j) / 7);
			const el = document.elementFromPoint(x, y);
			if (!el) continue;
			if (m.contains(el)) mine++;
			else { over++; kinds.add(`${el.tagName}.${(el.className || '').toString().split(' ')[0]}`); }
		}
	return { found: true, mine, over, kinds: [...kinds], rect: { x: Math.round(dr.x), y: Math.round(dr.y), w: Math.round(dr.width), h: Math.round(dr.height) } };
});
console.log(`dialog title z=${zr.titleZ}  dialog z=${zr.dialogZ}`);
if (!zc.found) {
	console.log(`switcher check skipped: ${zc.reason}`);
} else {
	console.log(`switcher menu: menu cells=${zc.mine}  covered cells=${zc.over}  ${zc.kinds.join(', ') || ''}`);
	console.log(`=> switcher menu fully clear of the dialog body/footer: ${zc.over === 0}`);
	await page.screenshot({
		path: `${OUT}fx-switcher.png`,
		clip: { x: Math.max(0, zc.rect.x - 30), y: Math.max(0, zc.rect.y - 10), width: zc.rect.w + 60, height: 520 }
	});
	console.log('saved fx-switcher.png');
}

console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
