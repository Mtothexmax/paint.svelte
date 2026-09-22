// Pixel check on the Layers header: is the rule under "LAYERS" actually
// painted, and are the icon glyphs vertically in line with the words?
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

const geom = await page.evaluate(() => {
	const t = [...document.querySelectorAll('.panel-title')].find((x) => x.textContent.trim() === 'Layers');
	const tr = t.getBoundingClientRect();
	const row = t.closest('.panel-head').getBoundingClientRect();
	// Where does the ::after rule land? Recompute from the title box.
	const cs = getComputedStyle(t, '::after');
	return {
		title: { top: +tr.top.toFixed(2), bottom: +tr.bottom.toFixed(2), left: +tr.left.toFixed(2), right: +tr.right.toFixed(2) },
		row: { top: +row.top.toFixed(2), bottom: +row.bottom.toFixed(2) },
		ruleBottom: cs.bottom,
		ruleHeight: cs.height,
		ruleBg: cs.backgroundColor,
		ruleLeft: cs.left,
		ruleRight: cs.right
	};
});
console.log(`title box : ${geom.title.top}..${geom.title.bottom}  x ${geom.title.left}..${geom.title.right}`);
console.log(`row box   : ${geom.row.top}..${geom.row.bottom}`);
console.log(`rule      : bottom=${geom.ruleBottom} height=${geom.ruleHeight} bg=${geom.ruleBg}`);
const ruleY = geom.title.bottom + Math.abs(parseFloat(geom.ruleBottom));
console.log(`=> rule paints at y=${ruleY.toFixed(2)} (inside row: ${ruleY >= geom.row.top && ruleY <= geom.row.bottom})`);

// Sample the actual pixels just under the words to prove the rule is painted.
const shot = await page.screenshot({ encoding: 'base64', clip: { x: Math.round(geom.title.left), y: Math.round(geom.title.top) - 2, width: Math.round(geom.title.right - geom.title.left), height: Math.round(geom.title.bottom - geom.title.top) + 10 } });
const png = Buffer.from(shot, 'base64');
// Decode with a tiny PNG reader via canvas in the page.
const probe = await page.evaluate(async (b64) => {
	const img = new Image();
	img.src = 'data:image/png;base64,' + b64;
	await img.decode();
	const c = document.createElement('canvas');
	c.width = img.width;
	c.height = img.height;
	const ctx = c.getContext('2d');
	ctx.drawImage(img, 0, 0);
	const rows = [];
	for (let y = 0; y < c.height; y++) {
		const d = ctx.getImageData(0, Math.round(c.width * 0.1), Math.round(c.width * 0.6), 1).data;
		let sum = 0;
		for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
		rows.push(Math.round(sum / (d.length / 4) / 3));
	}
	return rows;
}, shot);
console.log(`\nluminance per row of the title strip (${probe.length} rows @2x):`);
console.log('  ' + probe.map((v, i) => `${i}:${v}`).join(' '));
const dark = probe.map((v, i) => [i, v]).filter(([, v]) => v < 45);
console.log(`  darkest rows (rule/text): ${dark.map(([i, v]) => `${i}(${v})`).join(' ')}`);

await page.screenshot({ path: `${OUT}fix-layers-final.png`, clip: { x: Math.round(geom.title.left) - 12, y: Math.round(geom.row.top) - 8, width: 320, height: Math.round(geom.row.bottom - geom.row.top) + 24 } });
console.log(`\nsaved fix-layers-final.png`);
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
await browser.close();
