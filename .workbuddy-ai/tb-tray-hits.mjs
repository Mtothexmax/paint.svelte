// Nothing in the top strips may be shadowed by the tab tray. The tray is a
// transparent overlay spanning the top-right 25% of the window (z-index 40),
// so anything under its empty area used to be unclickable.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
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
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
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
	await sleep(450);
};
// "New…" only exists on the start screen; with a document already open, new
// documents come from the File menu.
const newDocument = async () => {
	const hasDoc = await page.evaluate(() => document.querySelectorAll('.fltab').length > 0);
	if (hasDoc) {
		await page.evaluate(() => {
			[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'File')?.click();
		});
		await sleep(400);
		await page.evaluate(() => {
			// The row's textContent includes its leading icon glyph, so match
			// on "contains" rather than "starts with".
			[...document.querySelectorAll('.menu-panel .menu-item')]
				.find((x) => x.textContent.includes('New'))
				?.click();
		});
	} else {
		await clickByText('New…');
	}
	await page.waitForFunction(() => !!document.querySelector('.m-dialog'), { timeout: 15000 });
	await sleep(500);
	await clickByText('SVGA');
	await clickByText('Create');
	await page.waitForFunction(() => !document.querySelector('.m-dialog'), { timeout: 15000 });
	await sleep(1600);
};

await newDocument();
await newDocument();
console.log(`documents open: ${await page.evaluate(() => document.querySelectorAll('.fltab').length)}`);

await page.evaluate(() => document.querySelector('.tool-btn[aria-label="Rectangle Select"]')?.click());
await sleep(500);
const c = await page.evaluate(() => {
	const r = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: r.x, y: r.y, w: r.width, h: r.height };
});
await page.mouse.move(c.x + c.w * 0.3, c.y + c.h * 0.3);
await page.mouse.down();
await page.mouse.move(c.x + c.w * 0.6, c.y + c.h * 0.6, { steps: 12 });
await page.mouse.up();
await sleep(800);

const report = await page.evaluate(() => {
	const tray = document.querySelector('.tab-tray-overlay');
	const tr = tray.getBoundingClientRect();
	const rows = [];
	const check = (el, kind) => {
		const r = el.getBoundingClientRect();
		if (r.width < 2 || r.height < 2) return; // hidden
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		const hit = document.elementFromPoint(cx, cy);
		const ok = !!(hit && (hit === el || el.contains(hit) || hit.contains(el)));
		rows.push({
			kind,
			label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 22),
			x: Math.round(r.x),
			inTray: cx >= tr.x && cx <= tr.right && cy >= tr.y && cy <= tr.bottom,
			hit: hit ? `${hit.tagName}.${(hit.className || '').toString().split(' ')[0]}` : 'null',
			ok
		});
	};
	document.querySelectorAll('.menubar-btn').forEach((b) => check(b, 'menubar'));
	document.querySelectorAll('.options-strip button, .options-strip input').forEach((b) => check(b, 'strip'));
	document.querySelectorAll('.fltab').forEach((b) => check(b, 'tab'));
	return { tray: { x: Math.round(tr.x), w: Math.round(tr.width), h: Math.round(tr.height) }, rows };
});

console.log(`tray box: x=${report.tray.x} w=${report.tray.w} h=${report.tray.h}`);
for (const r of report.rows) {
	console.log(
		`${r.ok ? 'ok  ' : 'BLOCKED'} ${r.kind.padEnd(8)} x=${String(r.x).padStart(4)} inTray=${String(r.inTray).padEnd(5)} hit=${r.hit.padEnd(22)} ${r.label}`
	);
}

const blocked = report.rows.filter((r) => !r.ok);
const tabs = report.rows.filter((r) => r.kind === 'tab');
const inTray = report.rows.filter((r) => r.inTray);

// The mechanism: the overlay is click-through, the tabs opt back in.
const mech = await page.evaluate(() => {
	const tray = document.querySelector('.tab-tray-overlay');
	const tr = tray.getBoundingClientRect();
	// Points inside the tray box that are NOT on a tab: the strip row and the
	// menubar row, plus the gap between tabs.
	const pts = [
		{ x: Math.round(tr.left + 6), y: Math.round(tr.top + 48) },
		{ x: Math.round(tr.left + 6), y: Math.round(tr.top + 10) },
		{ x: Math.round(tr.right - 6), y: Math.round(tr.top + 48) }
	];
	const hits = pts.map((p) => {
		const el = document.elementFromPoint(p.x, p.y);
		return el ? `${el.tagName}.${(el.className || '').toString().split(' ')[0]}` : 'null';
	});
	return {
		overlay: getComputedStyle(tray).pointerEvents,
		tab: getComputedStyle(document.querySelector('.fltab')).pointerEvents,
		hits
	};
});
const swallowed = mech.hits.filter((h) => h.startsWith('DIV.tab-tray-overlay') || h.startsWith('DIV.fltab-tray'));

console.log('');
console.log(`tray overlay pointer-events = ${mech.overlay} (want none)`);
console.log(`tab pointer-events          = ${mech.tab} (want auto)`);
console.log(`empty tray points resolve to: ${mech.hits.join(', ')}`);
console.log(`controls inside the tray box: ${inTray.length}`);
console.log(`tabs still clickable: ${tabs.length > 0 && tabs.every((t) => t.ok)} (${tabs.length} tabs)`);
console.log(`blocked controls: ${blocked.length}${blocked.length ? ' -> ' + blocked.map((b) => b.label).join(', ') : ''}`);
console.log(`empty tray area swallows clicks: ${swallowed.length > 0}`);
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);

// Prove the tab is really clickable with a real mouse click: switching
// documents changes the active tab.
const tabInfo = await page.evaluate(() => {
	const t = [...document.querySelectorAll('.fltab')];
	return { n: t.length, activeBefore: t.findIndex((x) => x.classList.contains('active')) };
});
const target = await page.evaluate(() => {
	const t = [...document.querySelectorAll('.fltab')].find((x) => !x.classList.contains('active'));
	if (!t) return null;
	const r = t.getBoundingClientRect();
	return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
});
if (target) {
	await page.mouse.click(target.cx, target.cy);
	await sleep(900);
	const activeAfter = await page.evaluate(() =>
		[...document.querySelectorAll('.fltab')].findIndex((x) => x.classList.contains('active'))
	);
	console.log(`real click on a tab: active ${tabInfo.activeBefore} -> ${activeAfter} (switched = ${activeAfter !== tabInfo.activeBefore})`);
} else {
	console.log('real click on a tab: only one tab, skipped');
}
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
process.exit(blocked.length || swallowed.length ? 1 : 0);
