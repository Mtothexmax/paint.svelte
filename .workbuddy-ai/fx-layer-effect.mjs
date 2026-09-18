// Verify the LAYER-EFFECT dialog still works after adding the `select` kind to
// it. It is reached from the Layers panel: right-click a layer row, then
// "─ Add Layer Effect ─" lists the effects of the OBJECT submenu (layer styles:
// Bevel, Drop Shadow, Feather, Outline — like Photoshop).
//
// The `select` branch is currently unreachable there (no Object effect uses it
// yet), so what this actually guards is that the edit did not BREAK the dialog:
// it still opens, still renders its params, and still applies.
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
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => !!document.querySelector('.menubar-btn'), { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await sleep(450);
};
const pickTool = async (l) => {
	await page.evaluate((x) => document.querySelector(`button[aria-label="${x}"]`)?.click(), l);
	await sleep(300);
};

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);

const clip = await page.evaluate(() => {
	const b = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
});

// A black square on a transparent ground, well inside the canvas, so the drop
// shadow has somewhere to show.
const S = { x0: clip.x + 380, y0: clip.y + 300, x1: clip.x + 660, y1: clip.y + 520 };
await pickTool('Rectangle Select');
await page.mouse.move(S.x0, S.y0);
await page.mouse.down();
await page.mouse.move(S.x1, S.y1, { steps: 8 });
await page.mouse.up();
await sleep(320);
await pickTool('Paint Bucket');
await page.mouse.move((S.x0 + S.x1) / 2, (S.y0 + S.y1) / 2);
await page.mouse.down();
await page.mouse.up();
await sleep(800);
await page.keyboard.down('Control');
await page.keyboard.press('d');
await page.keyboard.up('Control');
await sleep(400);

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });
const canvasHash = async () => {
	const buf = await page.screenshot({ clip });
	return buf.toString('base64').slice(0, 4000) + '|' + buf.length;
};

// ---- right-click the layer row -> Add Layer Effect ------------------------
const rows = await page.evaluate(() => document.querySelectorAll('.layer-row').length);
check('the layers panel shows a layer row', rows >= 1, `rows=${rows}`);

const rowBox = await page.evaluate(() => {
	const r = document.querySelector('.layer-row');
	if (!r) return null;
	const b = r.getBoundingClientRect();
	return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
});
await page.mouse.click(rowBox.x, rowBox.y, { button: 'right' });
await sleep(500);

const menu = await page.evaluate(() =>
	[...document.querySelectorAll('.ctx-item')].map((b) => b.textContent.replace(/\s+/g, ' ').trim())
);
check('right-click opens the layer context menu', menu.length > 0, `${menu.length} items`);
check(
	'the menu offers "Add Layer Effect"',
	menu.some((m) => /Add Layer Effect/i.test(m)),
	`items=[${menu.slice(0, 6).join(' | ')}]`
);
check(
	'it lists the Object-submenu layer styles',
	['Bevel', 'Drop Shadow', 'Feather', 'Outline'].every((n) => menu.some((m) => m.includes(n))),
	`effects=[${menu.filter((m) => /Bevel|Drop Shadow|Feather|Outline/.test(m)).join(', ')}]`
);

// ---- open Drop Shadow as a layer effect ----------------------------------
const before = await canvasHash();
await page.evaluate(() => {
	[...document.querySelectorAll('.ctx-item')].find((b) => b.textContent.includes('Drop Shadow'))?.click();
});
for (let i = 0; i < 40; i++) {
	if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) break;
	await sleep(150);
}
await sleep(600);

const dlg = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	if (!d) return null;
	return {
		title: d.querySelector('.m-title-text')?.textContent?.trim() ?? d.querySelector('.m-title')?.textContent?.trim() ?? null,
		hasPad: !!d.querySelector('.xyp-pad'),
		padLabel: d.querySelector('.xyp-label')?.textContent?.trim() ?? null,
		colorRows: [...d.querySelectorAll('.fcol-label')].map((s) => s.textContent.trim()),
		sliderLabels: [...d.querySelectorAll('.fsl-label')].map((s) => s.textContent.trim()),
		selects: d.querySelectorAll('.fsel-input').length,
		hasApply: !!([...d.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply')))
	};
});
check('the layer-effect dialog opens', !!dlg, JSON.stringify(dlg));
check(
	'titled as a layer effect',
	/Layer Effect/i.test(dlg?.title ?? ''),
	`title="${dlg?.title}"`
);
check('renders the offset pad', dlg?.hasPad === true, `pad=${dlg?.padLabel}`);
check(
	'renders the colour row',
	dlg?.colorRows.join(',') === 'Color',
	`colors=[${dlg?.colorRows?.join(', ')}]`
);
check(
	'renders its sliders',
	dlg?.sliderLabels.join(',') === 'Blur Radius,Opacity',
	`sliders=[${dlg?.sliderLabels?.join(', ')}]`
);
check('has an Apply button', dlg?.hasApply === true, `apply=${dlg?.hasApply}`);

// ---- change the shadow colour and apply ----------------------------------
const swatchBefore = await page.evaluate(() => {
	const row = document.querySelector('.m-dialog .fcol');
	const btn = [...row.querySelectorAll('.fcol-btn')].find((b) => /background/i.test(b.title));
	btn?.click();
	return getComputedStyle(row.querySelector('.fcol-stored')).backgroundColor;
});
await sleep(400);
const swatchAfter = await page.evaluate(() =>
	getComputedStyle(document.querySelector('.m-dialog .fcol-stored')).backgroundColor
);
check(
	'the colour row repaints to white on click',
	swatchBefore === 'rgb(0, 0, 0)' && swatchAfter === 'rgb(255, 255, 255)',
	`${swatchBefore} -> ${swatchAfter}`
);

await page.evaluate(() => {
	[...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'))?.click();
});
await sleep(1400);
const after = await canvasHash();
const dialogGone = await page.evaluate(() => !document.querySelector('.m-dialog'));
check('applying closes the dialog', dialogGone, `dialogGone=${dialogGone}`);
check('applying changes the canvas', before !== after, `hash ${before.length} vs ${after.length}`);
check('no console errors', errors.length === 0, errors.slice(0, 3).join(' / '));

await page.screenshot({ path: `${OUT}fx-layer-effect.png`, clip });
await browser.close();

console.log('--- layer-effect dialog (Layers panel ▸ right-click ▸ Add Layer Effect) ---');
console.log(`context menu  : ${menu.length} items; layer styles offered`);
console.log(`dialog title  : ${dlg?.title}`);
console.log(`pad=${dlg?.padLabel}  colors=[${dlg?.colorRows?.join(', ')}]  sliders=[${dlg?.sliderLabels?.join(', ')}]  selects=${dlg?.selects}`);
console.log('');
let fails = 0;
for (const r of results) {
	if (!r.ok) fails++;
	console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`);
}
console.log(`\n${results.length - fails}/${results.length} passed   errors : ${errors.length ? errors.length : 'none'}`);
process.exit(fails ? 1 : 0);
