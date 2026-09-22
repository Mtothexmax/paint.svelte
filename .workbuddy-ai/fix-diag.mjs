// Two things to diagnose:
//  1. the Layers panel header icon buttons sit "a bit below" the "Layers" title
//  2. the Effects menu's colours + z-index vs the rest of the chrome
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

// ---------- 1. Layers header alignment ----------
const head = await page.evaluate(() => {
	// The ink box of a text node, not the element box: a bottom border/padding
	// on .panel-title pushes its BOX centre below its TEXT centre, which is
	// exactly the "buttons look a bit below" symptom.
	const inkOf = (el) => {
		const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
		if (!node) return null;
		const r = document.createRange();
		r.selectNodeContents(node);
		const b = r.getBoundingClientRect();
		return { top: +b.top.toFixed(2), bottom: +b.bottom.toFixed(2), cy: +((b.top + b.bottom) / 2).toFixed(2), h: +b.height.toFixed(2) };
	};
	const title = document.querySelector('.panel-title');
	const tr = title.getBoundingClientRect();
	const cs = getComputedStyle(title);
	const btns = [...document.querySelectorAll('.panel-title ~ div .mini-btn, .panel-card > div:first-child .mini-btn')];
	const rows = btns.map((b) => {
		const br = b.getBoundingClientRect();
		return {
			text: b.textContent.trim(),
			boxCy: +((br.top + br.bottom) / 2).toFixed(2),
			boxTop: +br.top.toFixed(2),
			boxBottom: +br.bottom.toFixed(2),
			ink: inkOf(b)
		};
	});
	return {
		titleBox: { top: +tr.top.toFixed(2), bottom: +tr.bottom.toFixed(2), h: +tr.height.toFixed(2) },
		titlePad: cs.padding, titleMargin: cs.margin, titleBorder: cs.borderBottom,
		titleInk: inkOf(title),
		rows
	};
});

console.log('=== Layers header ===');
console.log(
	`title box   : top=${head.titleBox.top} bottom=${head.titleBox.bottom} h=${head.titleBox.h}  padding=${head.titlePad} margin=${head.titleMargin} borderBottom=${head.titleBorder}`
);
console.log(`title ink   : cy=${head.titleInk?.cy} (h=${head.titleInk?.h})`);
for (const r of head.rows) {
	const d = r.ink ? +(r.ink.cy - head.titleInk.cy).toFixed(2) : null;
	console.log(
		`  btn ${r.text.padEnd(2)} box cy=${String(r.boxCy).padStart(7)}  ink cy=${String(r.ink?.cy).padStart(7)}  ink-title = ${d >= 0 ? '+' : ''}${d}`
	);
}
const offs = head.rows.map((r) => r.ink.cy - head.titleInk.cy);
console.log(`glyph-vs-title offset: min=${Math.min(...offs).toFixed(2)} max=${Math.max(...offs).toFixed(2)}`);

const crop = await page.evaluate(() => {
	const el = document.querySelector('.panel-title').closest('.panel-card');
	const r = el.getBoundingClientRect();
	return { x: Math.round(r.x) - 4, y: Math.round(r.y) - 4, width: Math.round(r.width) + 8, height: 62 };
});
await page.screenshot({ path: `${OUT}fix-layers-header.png`, clip: crop });

// ---------- 2. Effects menu ----------
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
});
await sleep(800);

const menu = await page.evaluate(() => {
	const m = document.querySelector('.fx-add-menu');
	if (!m) return { found: false };
	const cs = getComputedStyle(m);
	const search = m.querySelector('.fx-add-search');
	const item = m.querySelector('.fx-add-item');
	const r = m.getBoundingClientRect();
	// Is anything painting on top of the menu?
	const probes = [0.25, 0.5, 0.75].map((t) => {
		const x = Math.round(r.left + r.width * 0.5);
		const y = Math.round(r.top + r.height * t);
		const el = document.elementFromPoint(x, y);
		return el ? `${el.tagName}.${(el.className || '').toString().split(' ')[0]}` : 'null';
	});
	return {
		found: true,
		rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
		zIndex: cs.zIndex,
		bg: cs.backgroundColor,
		bgImage: cs.backgroundImage.slice(0, 80),
		border: cs.border,
		radius: cs.borderRadius,
		shadow: cs.boxShadow.slice(0, 120),
		searchBg: search ? getComputedStyle(search).backgroundColor : null,
		searchBorder: search ? getComputedStyle(search).border : null,
		itemColor: item ? getComputedStyle(item).color : null,
		headColor: m.querySelector('.fx-add-head-label') ? getComputedStyle(m.querySelector('.fx-add-head-label')).color : null,
		probeHits: probes,
		// what the sibling menus use
		menuPanelBg: getComputedStyle(document.querySelector('.menu-panel') ?? m).backgroundColor
	};
});
console.log('');
console.log('=== Effects menu ===');
if (!menu.found) {
	console.log('  (not found — did the menu open?)');
} else {
	console.log(`  rect   : ${JSON.stringify(menu.rect)}`);
	console.log(`  z-index: ${menu.zIndex}`);
	console.log(`  bg     : ${menu.bg}  image=${menu.bgImage}`);
	console.log(`  border : ${menu.border}   radius=${menu.radius}`);
	console.log(`  shadow : ${menu.shadow}`);
	console.log(`  search : bg=${menu.searchBg}  border=${menu.searchBorder}`);
	console.log(`  item color=${menu.itemColor}  head color=${menu.headColor}`);
	console.log(`  elementFromPoint down the menu: ${menu.probeHits.join(' | ')}`);
	const swallowed = menu.probeHits.some((h) => !h.startsWith('DIV.fx-add') && !h.startsWith('BUTTON.fx-add') && !h.startsWith('SPAN.fx-add') && !h.startsWith('INPUT.fx-add'));
	console.log(`  anything painting over the menu: ${swallowed}`);
	await page.screenshot({
		path: `${OUT}fix-effects-menu.png`,
		clip: { x: Math.max(0, menu.rect.x - 20), y: 0, width: Math.min(1400, menu.rect.w + 40), height: Math.min(880, menu.rect.y + menu.rect.h + 20) }
	});
}
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
