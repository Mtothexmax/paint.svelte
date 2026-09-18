// Follow-up to fx-smoke-all.mjs: re-test the rows that came back UNCHANGED (or
// suspiciously identical), with two fixes:
//
//   1. SETTLE after perturbing a parameter. The first version set a slider and
//      clicked Apply in the same tick, so Svelte had not yet re-evaluated the
//      derived `noop` and Apply was still disabled — the effect never ran.
//   2. Use a COLOURFUL base (a Julia fractal) instead of black/white squares.
//      Effects like Sepia, Hue/Saturation and Glow are no-ops on pure black and
//      white, and effects like Sharpen are no-ops on already-maximal edges, so
//      the earlier UNCHANGED verdicts were partly the scene's fault, not theirs.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const SUSPECTS = [
	['Photo', 'Glow'],
	['Photo', 'Red Eye Removal'],
	['Photo', 'Sharpen'],
	['Noise', 'Add Noise'],
	['Noise', 'Median'],
	['Noise', 'Reduce Noise'],
	['Adjustments', 'Exposure'],
	['Adjustments', 'Highlights / Shadows'],
	['Adjustments', 'Hue / Saturation'],
	['Adjustments', 'Sepia'],
	['Adjustments', 'Posterize'],
	['Adjustments', 'Threshold'],
	['Adjustments', 'Curves'],
	['Adjustments', 'Levels Adjustment']
];

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
		await sleep(260);
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
/** Report Apply's state, and perturb the strongest parameter if it is disabled. */
const prepare = async () => {
	const first = await page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		if (!d) return { dialog: false };
		const btn = [...d.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'));
		return { dialog: true, disabled: btn ? btn.disabled : null };
	});
	if (!first.dialog || first.disabled === false) return { ...first, note: 'defaults' };
	// Perturb, then let Svelte re-evaluate the derived noop before Apply is clicked.
	await page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		const set = (el, v) => {
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		};
		const range = d.querySelector('.fsl-range');
		if (range) {
			const lo = Number(range.min);
			const hi = Number(range.max);
			set(range, Math.round((lo + (hi - lo) * 0.6) * 1000) / 1000);
		} else {
			const dial = d.querySelector('.ang-num');
			if (dial) set(dial, 90);
		}
	});
	await sleep(600); // <-- the fix: give the derived state time to flush
	const after = await page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		const btn = [...d.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'));
		const range = d.querySelector('.fsl-range');
		return { stillDisabled: btn ? btn.disabled : null, value: range ? Number(range.value) : null };
	});
	return { dialog: true, disabled: true, note: `perturbed -> ${after.value}`, stillDisabled: after.stillDisabled };
};
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
const diffCount = async (ref, cur) =>
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
				return ctx.getImageData(0, 0, c.width, c.height).data;
			};
			const A = await load(arg.a);
			const B = await load(arg.b);
			let n = 0;
			for (let i = 0; i < A.length; i += 4) {
				const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
				if (d > 24) n++;
			}
			return n;
		},
		{ a: ref, b: cur }
	);

// ---- document + a colourful base -----------------------------------------
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);
const clip = await page.evaluate(() => {
	const b = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
});

// Julia Fractal as the base: colourful, high-frequency, with soft gradients —
// so Sepia/Hue/Glow/Sharpen all have something to bite on.
await openLeaf('Render', 'Julia Fractal');
await applyDialog();
await sleep(900);
const baseline = await shot();
const baseDiff = await diffCount(baseline, await shot());
console.log(`base built with Julia Fractal (self-diff ${baseDiff})`);

const rows = [];
for (const [group, leaf] of SUSPECTS) {
	const hadDialog = await openLeaf(group, leaf);
	let note = 'instant';
	let applied = null;
	if (hadDialog) {
		const prep = await prepare();
		note = prep.stillDisabled ? `${prep.note} (Apply STILL disabled)` : prep.note;
		applied = await applyDialog();
	} else {
		await sleep(700);
	}
	const n = await diffCount(baseline, await shot());
	await escape();
	await undo();
	const restored = await diffCount(baseline, await shot());
	rows.push({ group, leaf, n, note, applied, restored });
	console.log(
		`${n > 200 ? 'CHANGED  ' : 'UNCHANGED'} ${leaf.padEnd(22)} diff=${String(n).padStart(6)}  apply=${applied}  (${note})` +
			(restored > 200 ? `  [undo left ${restored}px]` : '')
	);
}

await browser.close();
const unchanged = rows.filter((r) => r.n <= 200);
console.log('');
console.log(`--- ${rows.length} re-tested on a colourful base ---`);
console.log(`changed   : ${rows.length - unchanged.length}`);
console.log(`unchanged : ${unchanged.length}${unchanged.length ? ' -> ' + unchanged.map((r) => `${r.group}/${r.leaf}`).join(', ') : ''}`);
console.log(`errors    : ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
process.exit(0);
