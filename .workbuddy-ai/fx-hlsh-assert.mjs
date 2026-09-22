// Asserts the DIRECTION of Highlights / Shadows, not just that they do
// something. The bug this guards against: a negative Highlights value used
// to brighten the image (the shader's negative branch was `-rgb` instead of
// `rgb`), so Highlights -90 came out BRIGHTER than Highlights +90.
//
// Contract (see the shader's own comment):
//   value > 0 -> push toward white   -> mean luminance UP
//   value < 0 -> push toward black   -> mean luminance DOWN
// ...and the same for Shadows. Tested on a BRIGHT base (Clouds, mean ~160)
// so the highlight mask is non-zero; a dark base legitimately no-ops it.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
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
const openMenu = async (label) => {
	await page.evaluate((l) => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === l)?.click();
	}, label);
	await sleep(260);
};
const escape = async () => {
	await page.keyboard.press('Escape');
	await sleep(200);
};
const openLeaf = async (group, leaf) => {
	await openMenu(group === 'Adjustments' ? 'Adjustments' : 'Effects');
	if (group !== 'Adjustments') {
		await page.evaluate((t) => {
			[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes(t))?.click();
		}, group);
		await sleep(300);
	}
	const sel = group === 'Adjustments' ? '.menu-panel .menu-item' : '.sub-panel .menu-item';
	await page.evaluate(
		(arg) => {
			[...document.querySelectorAll(arg.sel)].find((x) => x.textContent.includes(arg.leaf))?.click();
		},
		{ sel, leaf }
	);
	for (let i = 0; i < 20; i++) {
		if (await page.evaluate(() => !!document.querySelector('.m-dialog'))) {
			await sleep(500);
			return true;
		}
		await sleep(150);
	}
	return false;
};
// FilterSlider is a CUSTOM track (role="slider") — there is no
// input[type=range] in the dialog at all, so `.fsl-range` matches nothing and
// a probe built on it silently no-ops. Drive the always-editable `.fsl-input`
// text field instead (its input handler parses + calls setValue), and read the
// value back from the track's aria-valuenow.
const setSlider = async (i, v) => {
	await page.evaluate(
		(arg) => {
			const el = [...document.querySelectorAll('.m-dialog .fsl-input')][arg.i];
			if (!el) return;
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(arg.v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
		},
		{ i, v }
	);
	await sleep(600);
};
// EffectDialog persists last-used settings under `effects.<id>`, so the OTHER
// slider carries over from the previous case unless we zero it. Read them back
// so a contaminated case is visible rather than silently mis-measured.
const readSliders = async () =>
	page.evaluate(() =>
		[...document.querySelectorAll('.m-dialog .fsl-track')].map((t) => Number(t.getAttribute('aria-valuenow')))
	);
const applyDialog = async () => {
	const clicked = await page.evaluate(() => {
		const btn = [...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'));
		if (btn && !btn.disabled) {
			btn.click();
			return true;
		}
		return false;
	});
	await sleep(1200);
	return clicked;
};
const undo = async () => {
	await page.keyboard.down('Control');
	await page.keyboard.press('z');
	await page.keyboard.up('Control');
	await sleep(800);
};
const shot = async () => (await page.screenshot({ clip })).toString('base64');
const stats = async (ref, cur) =>
	page.evaluate(
		async (arg) => {
			const load = async (b64) => {
				const img = new Image();
				img.src = 'data:image/png;base64,' + b64;
				await img.decode();
				const c = document.createElement('canvas');
				c.width = img.width;
				c.height = img.height;
				const ctx = c.getContext('2d');
				ctx.drawImage(img, 0, 0);
				return { d: ctx.getImageData(0, 0, c.width, c.height).data };
			};
			const A = await load(arg.a);
			const B = await load(arg.b);
			let n = 0;
			let sa = 0;
			let sb = 0;
			for (let i = 0; i < A.d.length; i += 4) {
				const la = (A.d[i] + A.d[i + 1] + A.d[i + 2]) / 3;
				const lb = (B.d[i] + B.d[i + 1] + B.d[i + 2]) / 3;
				sa += la;
				sb += lb;
				if (Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]) > 24) n++;
			}
			const px = A.d.length / 4;
			return { n, meanA: sa / px, meanB: sb / px };
		},
		{ a: ref, b: cur }
	);

await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);
const clip = await page.evaluate(() => {
	const b = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
});

// BRIGHT base so the highlight mask (pow(luma,3)) is actually non-zero.
await openLeaf('Render', 'Clouds');
await applyDialog();
await sleep(900);
const base = await shot();
const baseStats = await stats(base, base);
const m0 = baseStats.meanA;
console.log(`base = Clouds, mean luminance ${m0.toFixed(1)}\n`);

// highlights, shadows, label, expected direction of the mean ('up' | 'down').
// Both sliders are always written explicitly: the dialog remembers the last
// run, so leaving the other one alone would silently stack two effects.
const CASES = [
	[90, 0, 'Highlights +90', 'up'],
	[-90, 0, 'Highlights -90', 'down'],
	[0, 90, 'Shadows +90', 'up'],
	[0, -90, 'Shadows -90', 'down']
];

let pass = 0;
let fail = 0;
const means = {};

// Guard: if the driver cannot find the sliders, EVERY case below would
// "pass" vacuously (the dialog keeps its persisted values and the canvas
// still changes). Fail loudly instead.
{
	await openLeaf('Adjustments', 'Highlights / Shadows');
	const n = (await readSliders()).length;
	await escape();
	if (n !== 2) {
		console.log(`FAIL  driver found ${n} sliders in the dialog, expected 2 — probe is stale`);
		await browser.close();
		process.exit(1);
	}
	console.log(`driver OK: ${n} sliders found\n`);
}

for (const [hlVal, shVal, label, dir] of CASES) {
	await openLeaf('Adjustments', 'Highlights / Shadows');
	const before = await readSliders();
	await setSlider(0, hlVal);
	await setSlider(1, shVal);
	const after = await readSliders();
	const clicked = await applyDialog();
	const s = await stats(base, await shot());
	await escape();
	await undo();
	means[label] = s.meanB;

	const moved = s.meanB - s.meanA;
	const changed = s.n > 200;
	const rightWay = dir === 'up' ? moved > 3 : moved < -3;
	const ok = clicked && changed && rightWay;
	ok ? pass++ : fail++;
	console.log(
		`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(15)} apply=${String(clicked).padEnd(5)} diff=${String(s.n).padStart(6)}  mean ${s.meanA.toFixed(1)} -> ${s.meanB.toFixed(1)}  (want ${dir}, moved ${moved >= 0 ? '+' : ''}${moved.toFixed(1)})`
	);
	console.log(`      opened at ${JSON.stringify(before)} -> set ${JSON.stringify(after)}`);
}

// The headline regression: -90 must not out-brighten +90.
const hl = means['Highlights +90'] > means['Highlights -90'];
hl ? pass++ : fail++;
console.log(
	`${hl ? 'PASS' : 'FAIL'}  Highlights +90 brighter than -90   (+90 ${means['Highlights +90'].toFixed(1)} vs -90 ${means['Highlights -90'].toFixed(1)})`
);

await browser.close();
console.log(`\n${pass}/${pass + fail} PASS`);
console.log(`errors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
process.exit(fail ? 1 : 0);
