// Two scenarios involving the effect browser inside a dialog:
//  A) FilterPopup open -> click the title-bar switcher -> does the menu clear
//     the dialog's own body/footer?
//  B) FilterPopup open -> open the menubar Effects menu -> is it above the dialog?
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
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
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
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1800);

// Open an effect WITH parameters (so the popup has a body + footer) from the
// Effects menu: search then click.
const openEffect = async (name) => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
	});
	await sleep(500);
	await page.evaluate((n) => {
		const s = document.querySelector('.fx-add-search');
		if (s) {
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(s, n);
			s.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}, name);
	await sleep(500);
	const clicked = await page.evaluate((n) => {
		const b = [...document.querySelectorAll('.fx-add-item')].find((x) => x.textContent.includes(n));
		b?.click();
		return !!b;
	}, name);
	await sleep(1200);
	return clicked;
};

console.log(`opened "Gaussian Blur": ${await openEffect('Gaussian Blur')}`);
console.log(`.m-dialog present: ${await page.evaluate(() => !!document.querySelector('.m-dialog'))}`);

// Which direct children does the dialog have, and what z-index do they get?
const stack = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return null;
	return {
		children: [...d.children].map((c) => {
			const cs = getComputedStyle(c);
			return `${c.className.toString().split(' ')[0]}: z=${cs.zIndex} pos=${cs.position}`;
		}),
		dialogZ: getComputedStyle(d).zIndex
	};
});
console.log('dialog children:', JSON.stringify(stack, null, 1));

// ---- A) switcher menu inside the dialog ----
await page.evaluate(() => document.querySelector('.m-dialog .filter-switcher .m-menu-btn')?.click());
await sleep(800);
const a = await page.evaluate(() => {
	const m = document.querySelector('.m-dialog .fx-add-menu');
	if (!m) return { found: false };
	const r = m.getBoundingClientRect();
	const counts = new Map();
	for (let i = 1; i <= 8; i++) {
		for (let j = 1; j <= 8; j++) {
			const x = Math.round(r.left + (r.width * i) / 9);
			const y = Math.round(r.top + (r.height * j) / 9);
			const el = document.elementFromPoint(x, y);
			if (!el) continue;
			const key = `${m.contains(el) ? 'menu:' : 'OVER:'}${el.tagName}.${(el.className || '').toString().split(' ').slice(0, 2).join('.')}`;
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
	}
	const cs = getComputedStyle(m);
	return {
		found: true,
		rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
		z: cs.zIndex,
		bg: cs.backgroundColor,
		hits: [...counts.entries()].sort((p, q) => q[1] - p[1])
	};
});
console.log('\n=== A) switcher menu inside the FilterPopup ===');
if (!a.found) console.log('  switcher menu did not open');
else {
	console.log(`  rect ${JSON.stringify(a.rect)}  z-index=${a.z}  bg=${a.bg}`);
	for (const [k, n] of a.hits) console.log(`    ${String(n).padStart(3)}x ${k}`);
	const over = a.hits.filter(([k]) => k.startsWith('OVER:'));
	console.log(`  COVERED cells: ${over.reduce((s, [, n]) => s + n, 0)}${over.length ? ' -> ' + over.map(([k]) => k).join(', ') : '  (none)'}`);
	await page.screenshot({
		path: `${OUT}fxmenu-in-dialog.png`,
		clip: { x: Math.max(0, a.rect.x - 30), y: Math.max(0, a.rect.y - 60), width: Math.min(700, a.rect.w + 60), height: Math.min(880, a.rect.h + 120) }
	});
}

// ---- B) menubar Effects menu while the dialog is open ----
await page.keyboard.press('Escape');
await sleep(400);
await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
await sleep(700);
console.log(`\ndialog closed: ${await page.evaluate(() => !document.querySelector('.m-dialog'))}`);

console.log(`\nerrors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
