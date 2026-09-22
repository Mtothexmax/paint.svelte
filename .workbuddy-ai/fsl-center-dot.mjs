// The centre marker must be a DOT, not a full-height line: square bounding
// box, round corners, centred on the track both axes. Asserted on
// Highlights / Shadows, which has two centerTick sliders.
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

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1800);

// Adjustments ▸ Highlights / Shadows
await page.evaluate(() => {
	[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Adjustments')?.click();
});
await sleep(300);
await page.evaluate(() => {
	[...document.querySelectorAll('.menu-panel .menu-item')].find((x) => x.textContent.includes('Highlights / Shadows'))?.click();
});
for (let i = 0; i < 20; i++) {
	if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) break;
	await sleep(150);
}
await sleep(700);

const geom = await page.evaluate(() => {
	const dots = [...document.querySelectorAll('.m-dialog .fsl-tick-center')];
	const tracks = [...document.querySelectorAll('.m-dialog .fsl-track')];
	return dots.map((d, i) => {
		const r = d.getBoundingClientRect();
		const t = tracks[i].getBoundingClientRect();
		const cs = getComputedStyle(d);
		return {
			w: +r.width.toFixed(2),
			h: +r.height.toFixed(2),
			radius: cs.borderRadius,
			dotCx: +(r.left + r.width / 2).toFixed(2),
			dotCy: +(r.top + r.height / 2).toFixed(2),
			trackCx: +(t.left + t.width / 2).toFixed(2),
			trackCy: +(t.top + t.height / 2).toFixed(2),
			trackW: +t.width.toFixed(1),
			trackH: +t.height.toFixed(1),
			bg: cs.backgroundColor
		};
	});
});

console.log(`centre markers found: ${geom.length}`);
geom.forEach((g, i) =>
	console.log(
		`  [${i}] size ${g.w}x${g.h} radius ${g.radius} bg ${g.bg}  ` +
			`dot(${g.dotCx},${g.dotCy}) vs track(${g.trackCx},${g.trackCy})  track ${g.trackW}x${g.trackH}`
	)
);

const checks = [];
const near = (a, b, tol) => Math.abs(a - b) <= tol;
checks.push(['the dialog shows one centre marker per slider', geom.length === 2]);
checks.push([
	'the marker is a dot, not a full-height line (square, and small vs the track)',
	geom.every((g) => near(g.w, g.h, 0.6) && g.w < g.trackH * 0.5 && g.h < g.trackH * 0.5)
]);
checks.push(['the marker is round', geom.every((g) => g.radius.includes('50%'))]);
checks.push([
	'the marker sits at the track centre horizontally',
	geom.every((g) => near(g.dotCx, g.trackCx, 1))
]);
checks.push([
	'the marker sits at the track centre vertically (the middle, not the top)',
	geom.every((g) => near(g.dotCy, g.trackCy, 1))
]);
checks.push([
	'the old full-height line is gone (height was track height minus 6px)',
	geom.every((g) => Math.abs(g.h - (g.trackH - 6)) > 1)
]);

await page.screenshot({ path: OUT + 'fsl-center-dot.png' });
console.log('saved fsl-center-dot.png');

// Zoomed crop of the first track so the dot is clearly visible.
const crop = await page.evaluate(() => {
	const t = document.querySelector('.m-dialog .fsl-track').getBoundingClientRect();
	return { x: Math.round(t.x) - 6, y: Math.round(t.y) - 6, width: Math.round(t.width) + 12, height: Math.round(t.height) + 12 };
});
await page.screenshot({ path: OUT + 'fsl-center-dot-zoom.png', clip: crop });
console.log('saved fsl-center-dot-zoom.png');

// At value 0 the thumb sits exactly ON the centre, hiding the dot (the same
// was true of the old line). The dot matters when the thumb is elsewhere, so
// capture that too — this is the state a user actually reads the marker in.
// FilterSlider has no input[type=range]: drive its `.fsl-input` text field.
await page.evaluate(() => {
	const el = document.querySelectorAll('.m-dialog .fsl-input')[0];
	if (!el) return;
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '90');
	el.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(700);
await page.screenshot({ path: OUT + 'fsl-center-dot-offset.png', clip: crop });
console.log('saved fsl-center-dot-offset.png');

// The dot must survive the move: same centre, still visible (not covered).
const after = await page.evaluate(() => {
	const d = document.querySelector('.m-dialog .fsl-tick-center');
	const t = document.querySelector('.m-dialog .fsl-track');
	const th = document.querySelector('.m-dialog .fsl-thumb');
	const rd = d.getBoundingClientRect();
	const rt = t.getBoundingClientRect();
	const rth = th.getBoundingClientRect();
	const covered = !(rd.right < rth.left || rd.left > rth.right);
	return {
		dotCx: +(rd.left + rd.width / 2).toFixed(2),
		trackCx: +(rt.left + rt.width / 2).toFixed(2),
		covered
	};
});
console.log(`  after moving to 90: dot centre ${after.dotCx} vs track centre ${after.trackCx}, covered by thumb = ${after.covered}`);

let pass = 0;
let fail = 0;
for (const [label, ok] of checks) {
	ok ? pass++ : fail++;
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}
await browser.close();
console.log(`\n${pass}/${pass + fail} PASS`);
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
process.exit(fail ? 1 : 0);
