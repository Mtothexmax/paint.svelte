// Smoke-test EVERY effect: does applying it visibly change the canvas?
//
// Two lessons from the first attempt are baked in:
//
//  1. Many effects are NO-OPS AT THEIR DEFAULTS, so their Apply button is
//     disabled (e.g. Brightness/Contrast is `isNoop: brightness===0 &&
//     contrast===0`). Clicking a disabled Apply does nothing, and the following
//     Ctrl+Z then undoes the SCENE PAINTING instead — which progressively ate
//     the document and made every later row look "changed". So: if Apply is
//     disabled, perturb a parameter first.
//  2. A blur CONSERVES THE MEAN, so the mean is useless as a change metric.
//     Compare frames pixel-by-pixel and count differing pixels.
//
// The scene is a black square and a white square on a TRANSPARENT ground: hard
// edges (blurs, emboss, edge detect), alpha edges (bevel, feather, outline) and
// transparency (drop shadow) in one go.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const TARGETS = [
	['Blurs', 'Frosted Glass'],
	['Blurs', 'Gaussian Blur'],
	['Blurs', 'Motion Blur'],
	['Blurs', 'Radial Blur'],
	['Blurs', 'Rotary Blur'],
	['Blurs', 'Smart Blur'],
	['Blurs', 'Surface Blur'],
	['Blurs', 'Unfocus'],
	['Blurs', 'Zoom Blur'],
	['Distort', 'Bulge'],
	['Distort', 'Crystalize'],
	['Distort', 'Pixelate'],
	['Distort', 'Polar Inversion'],
	['Distort', 'Smudge'],
	['Distort', 'Tile Reflection'],
	['Distort', 'Twist'],
	['Distort', 'Warp'],
	['Noise', 'Add Noise'],
	['Noise', 'Median'],
	['Noise', 'Reduce Noise'],
	['Photo', 'Glow'],
	['Photo', 'Red Eye Removal'],
	['Photo', 'Sharpen'],
	['Photo', 'Soften Portrait'],
	['Render', 'Clouds'],
	['Render', 'Flames'],
	['Render', 'Julia Fractal'],
	['Render', 'Mandelbrot Fractal'],
	['Render', 'Turbulence'],
	['Stylize', 'Edge Detect'],
	['Stylize', 'Emboss'],
	['Stylize', 'Outline'],
	['Stylize', 'Relief'],
	['Object', 'Bevel'],
	['Object', 'Drop Shadow'],
	['Object', 'Feather'],
	['Object', 'Outline'],
	['Adjustments', 'Brightness / Contrast'],
	['Adjustments', 'Curves'],
	['Adjustments', 'Exposure'],
	['Adjustments', 'Highlights / Shadows'],
	['Adjustments', 'Hue / Saturation'],
	['Adjustments', 'Levels Adjustment'],
	['Adjustments', 'Posterize'],
	['Adjustments', 'Threshold'],
	['Adjustments', 'Auto-Level'],
	['Adjustments', 'Black and White'],
	['Adjustments', 'Invert Alpha'],
	['Adjustments', 'Invert Colors'],
	['Adjustments', 'Sepia']
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
const pickTool = async (l) => {
	await page.evaluate((x) => document.querySelector(`button[aria-label="${x}"]`)?.click(), l);
	await sleep(300);
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
/** Apply-button state, and a perturbation when it is disabled (a default no-op). */
const prepare = async () =>
	page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		if (!d) return { dialog: false };
		const btn = [...d.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'));
		if (!btn) return { dialog: true, applyMissing: true };
		if (!btn.disabled) return { dialog: true, disabled: false, note: 'defaults are enough' };
		const set = (el, v) => {
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		};
		const range = d.querySelector('.fsl-range');
		if (range) {
			const lo = Number(range.min);
			const hi = Number(range.max);
			const v = Math.round((lo + (hi - lo) * 0.6) * 100) / 100;
			set(range, v);
			return { dialog: true, disabled: true, note: `slider -> ${v}` };
		}
		const dial = d.querySelector('.ang-num');
		if (dial) {
			set(dial, 90);
			return { dialog: true, disabled: true, note: 'dial -> 90' };
		}
		return { dialog: true, disabled: true, note: 'could not perturb' };
	});
const applyDialog = async () => {
	await page.evaluate(() => {
		const btn = [...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'));
		if (btn && !btn.disabled) btn.click();
	});
	await sleep(1100);
};
const undo = async () => {
	await page.keyboard.down('Control');
	await page.keyboard.press('z');
	await page.keyboard.up('Control');
	await sleep(800);
};
const shot = async () => (await page.screenshot({ clip })).toString('base64');
/** Count pixels differing from `ref` by more than a small threshold. */
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
				const d =
					Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
				if (d > 24) n++;
			}
			return n;
		},
		{ a: ref, b: cur }
	);

// ---- document + scene -----------------------------------------------------
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);
const clip = await page.evaluate(() => {
	const b = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
});
const fill = async (x0, y0, x1, y1, button) => {
	await pickTool('Rectangle Select');
	await page.mouse.move(x0, y0);
	await page.mouse.down();
	await page.mouse.move(x1, y1, { steps: 8 });
	await page.mouse.up();
	await sleep(300);
	await pickTool('Paint Bucket');
	await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2);
	await page.mouse.down({ button });
	await page.mouse.up({ button });
	await sleep(700);
	await page.keyboard.down('Control');
	await page.keyboard.press('d');
	await page.keyboard.up('Control');
	await sleep(350);
};
const buildScene = async () => {
	await fill(clip.x + 300, clip.y + 260, clip.x + 540, clip.y + 480, 'left');
	await fill(clip.x + 640, clip.y + 260, clip.x + 880, clip.y + 480, 'right');
};
await buildScene();
const baseline = await shot();

const rows = [];
let rebuilds = 0;
for (const [group, leaf] of TARGETS) {
	const hadDialog = await openLeaf(group, leaf);
	let note = 'instant (applies on click)';
	if (hadDialog) {
		const prep = await prepare();
		note = prep.note ?? 'defaults';
		await applyDialog();
	} else {
		await sleep(700);
	}
	const after = await shot();
	const n = await diffCount(baseline, after);
	await escape();
	await undo();
	// Self-heal: if the scene did not come back, rebuild it so the next row is
	// measured against a clean baseline.
	const restored = await diffCount(baseline, await shot());
	if (restored > 200) {
		await buildScene();
		rebuilds++;
	}
	const ok = n > 200;
	rows.push({ group, leaf, hadDialog, n, note, restored, ok });
	console.log(
		`${ok ? 'CHANGED  ' : 'UNCHANGED'} ${leaf.padEnd(22)} diff=${String(n).padStart(7)}  (${note})` +
			(restored > 200 ? `  [scene rebuilt: undo left ${restored}px]` : '')
	);
}

await page.screenshot({ path: `${OUT}fx-smoke-scene.png`, clip });
await browser.close();

const unchanged = rows.filter((r) => !r.ok);
console.log('');
console.log(`--- ${rows.length} effects ---`);
console.log(`changed   : ${rows.length - unchanged.length}`);
console.log(`unchanged : ${unchanged.length}${unchanged.length ? ' -> ' + unchanged.map((r) => `${r.group}/${r.leaf}`).join(', ') : ''}`);
console.log(`scene rebuilds needed: ${rebuilds}`);
console.log(`errors    : ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
process.exit(unchanged.length ? 1 : 0);
