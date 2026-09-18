// The X in an effect dialog must close it with a REAL mouse click.
//
// Suspicion: `.m-close` sits inside `.m-title`, and `.m-title`'s pointerdown
// calls setPointerCapture on itself. Capturing the pointer retargets the
// follow-up `click` to the capture element, so the button's onclick never fires.
// A programmatic `el.click()` bypasses pointer events entirely and therefore
// hides the bug — which is why the earlier probes (all of which used
// `.click()`) passed.
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
const openEffect = async (sub, leaf) => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
	});
	await sleep(280);
	await page.evaluate((s) => {
		[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes(s))?.click();
	}, sub);
	await sleep(320);
	await page.evaluate((l) => {
		[...document.querySelectorAll('.sub-panel .menu-item')].find((x) => x.textContent.includes(l))?.click();
	}, leaf);
	await sleep(800);
};

/** Where did the click actually land? Records the capture-phase click target. */
const instrumentClicks = () =>
	page.evaluate(() => {
		window.__clicks = [];
		document.addEventListener(
			'click',
			(e) => {
				const t = e.target;
				window.__clicks.push(t?.className ? `${t.tagName}.${String(t.className).split(' ')[0]}` : String(t?.tagName));
			},
			true
		);
	});
const readClicks = () => page.evaluate(() => window.__clicks ?? []);

const dialogOpen = () => page.evaluate(() => !!document.querySelector('.m-dialog'));
const rectOf = (sel) =>
	page.evaluate((s) => {
		const el = document.querySelector(s);
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), title: el.title };
	}, sel);

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);

const results = {};

// ---- 1. the reported bug: REAL click on the X of Zoom Blur ----------------
await openEffect('Blurs', 'Zoom Blur');
await instrumentClicks();
const xBtn = await rectOf('.m-dialog .m-close');
await page.mouse.click(xBtn.x, xBtn.y);
await sleep(600);
results.realClickOnX = { closed: !(await dialogOpen()), clickTargets: await readClicks() };
await page.screenshot({ path: `${OUT}close-x-real-click.png` });

// if it is still open, get rid of it for the next case
if (await dialogOpen()) {
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(500);
}

// ---- 2. control: programmatic .click() on the X (bypasses pointer events) --
await openEffect('Blurs', 'Zoom Blur');
await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
await sleep(600);
results.programmaticX = { closed: !(await dialogOpen()) };

// ---- 3. control: Cancel (in the footer, no pointer capture) ---------------
await openEffect('Blurs', 'Zoom Blur');
const cancelBtn = await page.evaluate(() => {
	const b = [...document.querySelectorAll('.m-dialog .m-footer button')].find((x) =>
		x.textContent.includes('Cancel')
	);
	if (!b) return null;
	const r = b.getBoundingClientRect();
	return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
});
await page.mouse.click(cancelBtn.x, cancelBtn.y);
await sleep(600);
results.realClickOnCancel = { closed: !(await dialogOpen()) };

// ---- 4. real click on the X across the other dialogs ----------------------
const others = [];
for (const [sub, leaf] of [
	['Blurs', 'Motion Blur'],
	['Blurs', 'Rotary Blur'],
	['Blurs', 'Radial Blur'],
	['Distort', 'Twist']
]) {
	await openEffect(sub, leaf);
	const r = await rectOf('.m-dialog .m-close');
	if (!r) {
		others.push({ leaf, closed: null });
		continue;
	}
	await page.mouse.click(r.x, r.y);
	await sleep(600);
	const closed = !(await dialogOpen());
	others.push({ leaf, closed });
	if (!closed) {
		await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
		await sleep(500);
	}
}

// ---- 5. non-effect dialogs (they share MovableDialog) --------------------
const openViaMenu = async (menuLabel, itemText) => {
	await page.evaluate((m) => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === m)?.click();
	}, menuLabel);
	await sleep(280);
	await page.evaluate((t) => {
		[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes(t))?.click();
	}, itemText);
	await sleep(900);
};
const nonEffect = [];
for (const [menu, item] of [
	['Image', 'Resize…'],
	['Adjustments', 'Levels…']
]) {
	await openViaMenu(menu, item);
	const r = await rectOf('.m-dialog .m-close');
	if (!r) {
		nonEffect.push({ name: `${menu}/${item}`, closed: null, note: 'no dialog opened' });
		continue;
	}
	await page.mouse.click(r.x, r.y);
	await sleep(600);
	const closed = !(await dialogOpen());
	nonEffect.push({ name: `${menu}/${item}`, closed });
	if (!closed) {
		await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
		await sleep(500);
	}
}

// ---- 6. regression: the title bar must still drag -------------------------
await openEffect('Blurs', 'Zoom Blur');
const before = await page.evaluate(() => {
	const r = document.querySelector('.m-dialog').getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y) };
});
const titlePt = await page.evaluate(() => {
	const r = document.querySelector('.m-dialog .m-title-text').getBoundingClientRect();
	return { x: Math.round(r.x + 30), y: Math.round(r.y + r.height / 2) };
});
await page.mouse.move(titlePt.x, titlePt.y);
await page.mouse.down();
await page.mouse.move(titlePt.x + 120, titlePt.y + 60, { steps: 10 });
await page.mouse.up();
await sleep(400);
const after = await page.evaluate(() => {
	const r = document.querySelector('.m-dialog').getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y) };
});
// clicking the X must not drag the dialog either
const xr = await rectOf('.m-dialog .m-close');
await page.mouse.click(xr.x, xr.y);
await sleep(500);

await browser.close();

// ---- report --------------------------------------------------------------
console.log(`real click on X   : closed=${results.realClickOnX.closed}  click targets=${JSON.stringify(results.realClickOnX.clickTargets)}`);
console.log(`programmatic .click() on X : closed=${results.programmaticX.closed}`);
console.log(`real click on Cancel       : closed=${results.realClickOnCancel.closed}`);
console.log(`other dialogs (real click on X) : ${others.map((o) => `${o.leaf}=${o.closed}`).join('  ')}`);
console.log(`non-effect dialogs              : ${nonEffect.map((o) => `${o.name}=${o.closed}${o.note ? ` (${o.note})` : ''}`).join('  ')}`);
console.log(`title drag        : (${before.x},${before.y}) -> (${after.x},${after.y})  delta=(${after.x - before.x},${after.y - before.y})`);

const checks = [
	['REAL mouse click on the X closes Zoom Blur', results.realClickOnX.closed],
	['the click actually reaches .m-close', results.realClickOnX.clickTargets.includes('BUTTON.m-close')],
	['programmatic .click() on the X closes (control)', results.programmaticX.closed],
	['real click on Cancel closes (control)', results.realClickOnCancel.closed],
	...others.map((o) => [`real click on the X closes ${o.leaf}`, o.closed === true]),
	...nonEffect.map((o) => [`real click on the X closes ${o.name}`, o.closed === true]),
	['the title bar still drags', Math.abs(after.x - before.x) > 80 && Math.abs(after.y - before.y) > 30]
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`\nerrors : ${errors.length ? errors.join(' | ') : 'none'}`);
