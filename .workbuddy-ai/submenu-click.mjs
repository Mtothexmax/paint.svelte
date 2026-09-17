// Regression: clicking a submenu header must NEVER close its submenu.
// The reported flow was: Effects > hover "Blurs" (submenu opens) > click
// "Blurs" (submenu closed again). The click used to toggle; it must only open.
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
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await sleep(450);
};

// A document, so the effects are enabled and behave like the real app.
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);

/** Everything we care about, read straight off the DOM. */
const state = () =>
	page.evaluate(() => {
		const sub = document.querySelector('.sub-panel');
		return {
			menuOpen: !!document.querySelector('.menu-panel'),
			subOpen: !!sub,
			subItems: sub
				? [...sub.querySelectorAll('.menu-item')].map((b) => b.textContent.replace(/\s+/g, ' ').trim())
				: [],
			openHeaders: [...document.querySelectorAll('.sub-holder > .menu-item.open')].map((b) =>
				b.textContent.replace(/\s+/g, ' ').trim()
			),
			headers: [...document.querySelectorAll('.sub-holder > .menu-item')].map((b) =>
				b.textContent.replace(/\s+/g, ' ').trim()
			)
		};
	});

/** Centre of a submenu header, in page coords (for real mouse events). */
const headerPoint = (label) =>
	page.evaluate((l) => {
		const b = [...document.querySelectorAll('.sub-holder > .menu-item')].find((x) =>
			x.textContent.includes(l)
		);
		if (!b) return null;
		const r = b.getBoundingClientRect();
		return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
	}, label);

const openEffects = async () => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
	});
	await sleep(320);
};

// ---- 1. the exact reported flow -------------------------------------------
await openEffects();
const beforeHover = await state();

const blurs = await headerPoint('Blurs');
await page.mouse.move(blurs.x, blurs.y); // real pointerenter
await sleep(280);
const afterHover = await state();

// 10 clicks on the SAME header, with the pointer parked on it
const perClick = [];
for (let i = 1; i <= 10; i++) {
	await page.mouse.down();
	await page.mouse.up();
	await sleep(150);
	const s = await state();
	perClick.push(s.subOpen);
}
const after10 = await state();
await page.screenshot({ path: `${OUT}submenu-after-10-clicks.png` });

// ---- 2. clicking into the submenu still applies the effect ----------------
const itemPoint = await page.evaluate(() => {
	const b = document.querySelector('.sub-panel .menu-item');
	if (!b) return null;
	const r = b.getBoundingClientRect();
	return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), label: b.textContent.replace(/\s+/g, ' ').trim() };
});
let applied = null;
if (itemPoint) {
	await page.mouse.move(itemPoint.x, itemPoint.y);
	await sleep(150);
	const stillOpenWhileInside = (await state()).subOpen;
	await page.mouse.down();
	await page.mouse.up();
	await sleep(800);
	const dlg = await page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		return d ? d.querySelector('.m-title-text')?.textContent?.trim() ?? '(untitled)' : null;
	});
	applied = { label: itemPoint.label, stillOpenWhileInside, dialog: dlg };
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(400);
}

// ---- 3. regressions: switching, hover-away, menu toggle -------------------
await openEffects();
const b2 = await headerPoint('Blurs');
await page.mouse.move(b2.x, b2.y);
await sleep(250);
const photoPoint = await headerPoint('Photo');
let switched = null;
if (photoPoint) {
	await page.mouse.move(photoPoint.x, photoPoint.y);
	await sleep(280);
	const s = await state();
	switched = { subOpen: s.subOpen, openHeaders: s.openHeaders };
}
// hover away from the whole menu -> submenu closes, menu stays open
await page.mouse.move(900, 700);
await sleep(300);
const afterLeave = await state();
// clicking the menubar button again closes the whole menu
await openEffects();
await sleep(300);
const afterToggle = await state();

await browser.close();

// ---- report --------------------------------------------------------------
console.log(`headers         : ${beforeHover.headers.join(' | ')}`);
console.log(`before hover    : menu=${beforeHover.menuOpen} sub=${beforeHover.subOpen}`);
console.log(`after hover     : menu=${afterHover.menuOpen} sub=${afterHover.subOpen} open=[${afterHover.openHeaders}]`);
console.log(`submenu items   : ${afterHover.subItems.join(', ')}`);
console.log(`sub after each of 10 clicks : ${perClick.map((b) => (b ? 'open' : 'CLOSED')).join(' ')}`);
console.log(`after 10 clicks : menu=${after10.menuOpen} sub=${after10.subOpen} items=${after10.subItems.length}`);
if (applied)
	console.log(
		`click first item: "${applied.label}" sub-still-open-inside=${applied.stillOpenWhileInside} dialog=${applied.dialog}`
	);
if (switched) console.log(`hover Photo     : sub=${switched.subOpen} open=[${switched.openHeaders}]`);
console.log(`hover away      : menu=${afterLeave.menuOpen} sub=${afterLeave.subOpen}`);
console.log(`click Effects   : menu=${afterToggle.menuOpen} sub=${afterToggle.subOpen}`);

const checks = [
	['Effects opens a menu', beforeHover.menuOpen],
	['no submenu before hovering a header', !beforeHover.subOpen],
	['hovering "Blurs" opens its submenu', afterHover.subOpen],
	['submenu actually lists effects', afterHover.subItems.length >= 2],
	['header is marked open', afterHover.openHeaders.some((h) => h.includes('Blurs'))],
	['submenu stays open on EVERY one of 10 clicks', perClick.every(Boolean)],
	['submenu still open after the 10th click', after10.subOpen],
	['items still listed after 10 clicks', after10.subItems.length >= 2],
	['moving into the submenu keeps it open', !!applied?.stillOpenWhileInside],
	['clicking an item still opens the effect', !!applied?.dialog],
	['hovering another header switches the submenu', switched?.subOpen === true],
	['only one header marked open at a time', switched?.openHeaders.length === 1],
	['hovering away closes the submenu', !afterLeave.subOpen],
	['hovering away leaves the menu open', afterLeave.menuOpen],
	['clicking the menubar button closes the menu', !afterToggle.menuOpen]
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`\nerrors : ${errors.length ? errors.join(' | ') : 'none'}`);
