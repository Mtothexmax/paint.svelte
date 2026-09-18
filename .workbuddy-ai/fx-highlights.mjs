// Does Highlights actually work? The shader masks each slider by luminance:
//   highMask   = pow(luma, 3)      -> acts on BRIGHT pixels
//   shadowMask = pow(1 - luma, 3)  -> acts on DARK pixels
// So on a dark test image (my Julia base had mean ~60) Highlights is
// legitimately a no-op while Shadows does a lot. Test on a BRIGHT base
// (Clouds, mean ~160) where both masks are non-zero.
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
const setSlider = async (i, v) => {
	await page.evaluate(
		(arg) => {
			const el = [...document.querySelectorAll('.m-dialog .fsl-range')][arg.i];
			if (!el) return;
			Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(arg.v));
			el.dispatchEvent(new Event('input', { bubbles: true }));
			el.dispatchEvent(new Event('change', { bubbles: true }));
		},
		{ i, v }
	);
	await sleep(600);
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

// BRIGHT base: Clouds renders a light, high-variance image.
await openLeaf('Render', 'Clouds');
await applyDialog();
await sleep(900);
const base = await shot();
const baseStats = await stats(base, base);
console.log(`base = Clouds, mean luminance ${baseStats.meanA.toFixed(1)}`);

const CASES = [
	[0, 90, 'Highlights +90'],
	[0, -90, 'Highlights -90'],
	[1, 90, 'Shadows +90'],
	[1, -90, 'Shadows -90']
];
for (const [idx, val, label] of CASES) {
	await openLeaf('Adjustments', 'Highlights / Shadows');
	await setSlider(idx, val);
	const clicked = await applyDialog();
	const s = await stats(base, await shot());
	await escape();
	await undo();
	console.log(
		`${s.n > 200 ? 'CHANGED  ' : 'UNCHANGED'} ${label.padEnd(15)} apply=${clicked} diff=${String(s.n).padStart(6)}  mean ${s.meanA.toFixed(1)} -> ${s.meanB.toFixed(1)}`
	);
}

await browser.close();
console.log(`\nerrors: ${errors.length ? errors.slice(0, 3).join(' / ') : 'none'}`);
process.exit(0);
