// Does the Motion Blur rotation dial point the way the streak actually runs?
//
// Method: a black dot on a white layer, blurred with `Centered` OFF. With
// centered = 0 the shader samples from v to v + e, so the smear of a dot at P
// occupies the segment [P - e, P] — the visible streak extends in the -e
// direction. Its centroid therefore moves to P - e/2, i.e. the centroid shift
// IS the tail direction, directly comparable with the dial.
//
// Measured inside a fixed 400x400 screen box centred on the dot, which lies
// wholly inside the white image — the dark checkerboard contains pure black and
// would otherwise pollute the count.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = 'C:/dev/paint.svelte/.workbuddy-ai/';

const DOT = { x: 488, y: 388 }; // screen centre of the test dot
const BOX = 400; // scan box side, screen px
const DOT_R = 20; // half-side of the test dot, screen px
const DIST = 80; // blur distance, image px
const ANGLES = [0, 90, 180, 270];

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
const pickTool = async (l) => {
	await page.evaluate((x) => document.querySelector(`button[aria-label="${x}"]`)?.click(), l);
	await sleep(300);
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

/** Centroid + extent of the dark pixels inside a box centred on the dot. */
const darkCentroid = async (tag) => {
	const clip = {
		x: Math.round(DOT.x - BOX / 2),
		y: Math.round(DOT.y - BOX / 2),
		width: BOX,
		height: BOX
	};
	const buf = await page.screenshot({ clip });
	if (tag) await page.screenshot({ path: `${OUT}motion-${tag}.png`, clip });
	return page.evaluate(
		async (arg) => {
			const img = new Image();
			img.src = 'data:image/png;base64,' + arg.data;
			await img.decode();
			const c = document.createElement('canvas');
			c.width = img.width;
			c.height = img.height;
			const ctx = c.getContext('2d');
			ctx.drawImage(img, 0, 0);
			const px = ctx.getImageData(0, 0, c.width, c.height).data;
			let sx = 0,
				sy = 0,
				n = 0,
				minX = 1e9,
				minY = 1e9,
				maxX = -1,
				maxY = -1;
			for (let y = 0; y < c.height; y++)
				for (let x = 0; x < c.width; x++) {
					const i = (y * c.width + x) * 4;
					// anything not near-white: the streak is a light grey, so a
					// "pure black" threshold would find nothing. Safe because the
					// box lies wholly inside the white image (no checkerboard).
					const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
					if (lum < 215) {
						sx += x;
						sy += y;
						n++;
						if (x < minX) minX = x;
						if (x > maxX) maxX = x;
						if (y < minY) minY = y;
						if (y > maxY) maxY = y;
					}
				}
			return n
				? {
						n,
						cx: sx / n,
						cy: sy / n,
						w: maxX - minX + 1,
						h: maxY - minY + 1,
						box: [minX, minY, maxX, maxY]
					}
				: { n: 0 };
		},
		{ data: buf.toString('base64') }
	);
};

// ---- document: white layer + a small black dot ----------------------------
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1700);

await pickTool('Paint Bucket');
await page.mouse.move(650, 450);
await page.mouse.down({ button: 'right' }); // background -> white
await page.mouse.up({ button: 'right' });
await sleep(800);

await pickTool('Rectangle Select');
await page.mouse.move(DOT.x - DOT_R, DOT.y - DOT_R);
await page.mouse.down();
await page.mouse.move(DOT.x + DOT_R, DOT.y + DOT_R, { steps: 8 });
await page.mouse.up();
await sleep(350);
await pickTool('Paint Bucket');
await page.mouse.move(DOT.x, DOT.y);
await page.mouse.down(); // foreground -> black
await page.mouse.up();
await sleep(800);
await page.keyboard.down('Control');
await page.keyboard.press('d');
await page.keyboard.up('Control');
await sleep(500);

const C = BOX / 2;
const base = await darkCentroid('base');
console.log(`dot before blur : n=${base.n} centroid=(${base.cx.toFixed(1)}, ${base.cy.toFixed(1)}) size=${base.w}x${base.h}`);

// ---- one apply per dial angle --------------------------------------------
const rows = [];
for (const D of ANGLES) {
	await openEffect('Blurs', 'Motion Blur');

	const shape = await page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		return {
			hasDial: !!d.querySelector('.ang-svg'),
			sliderLabels: [...d.querySelectorAll('.fsl-label')].map((s) => s.textContent.trim()),
			checkboxes: d.querySelectorAll('input[type=checkbox]').length,
			dialValue: Number(d.querySelector('.ang-num')?.value)
		};
	});

	// Distance slider (index 0 of the sliders), Centered checkbox off, dial = D
	await page.evaluate(
		(arg) => {
			const d = document.querySelector('.m-dialog');
			const ranges = [...d.querySelectorAll('.fsl-range')];
			const setNum = (el, v) => {
				Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
				el.dispatchEvent(new Event('input', { bubbles: true }));
				el.dispatchEvent(new Event('change', { bubbles: true }));
			};
			setNum(ranges[0], arg.dist);
			const cb = d.querySelector('input[type=checkbox]');
			if (cb && cb.checked) {
				cb.checked = false;
				cb.dispatchEvent(new Event('change', { bubbles: true }));
			}
			const dial = d.querySelector('.ang-num');
			if (dial) setNum(dial, arg.d);
		},
		{ dist: DIST, d: D }
	);
	await sleep(500);
	const setTo = await page.evaluate(() => ({
		dial: Number(document.querySelector('.m-dialog .ang-num')?.value),
		centered: document.querySelector('.m-dialog input[type=checkbox]')?.checked
	}));

	await page.evaluate(() => {
		[...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'))?.click();
	});
	await sleep(1100);

	const after = await darkCentroid(`dial-${D}`);
	const dx = after.cx - base.cx;
	const dy = after.cy - base.cy;
	const len = Math.hypot(dx, dy);
	const dir = len ? { x: dx / len, y: dy / len } : { x: 0, y: 0 };
	// The dial reads 0 = up, clockwise -> screen direction (sin D, -cos D).
	const rad = (D * Math.PI) / 180;
	const want = { x: Math.sin(rad), y: -Math.cos(rad) };
	const dot = dir.x * want.x + dir.y * want.y;

	rows.push({ D, shape, setTo, after, dx, dy, len, dir, want, dot });

	// undo the apply, keep the dot
	await page.keyboard.down('Control');
	await page.keyboard.press('z');
	await page.keyboard.up('Control');
	await sleep(900);
}

await browser.close();

// ---- report --------------------------------------------------------------
const s0 = rows[0].shape;
console.log(`\ndialog          : dial=${s0.hasDial} sliders=[${s0.sliderLabels.join(', ')}] checkboxes=${s0.checkboxes}`);
console.log('\n  D    dial  centered   centroid shift (screen px)   dir(x,y)          dot  streak box');
for (const r of rows) {
	console.log(
		`  ${String(r.D).padStart(3)}  ${String(r.setTo.dial).padStart(4)}  ${String(r.setTo.centered).padStart(8)}   ` +
			`(${r.dx.toFixed(1).padStart(6)}, ${r.dy.toFixed(1).padStart(6)}) len=${r.len.toFixed(1).padStart(5)}  ` +
			`(${r.dir.x.toFixed(2).padStart(5)}, ${r.dir.y.toFixed(2).padStart(5)})  ${r.dot.toFixed(2).padStart(5)}  ${r.after.w ?? '-'}x${r.after.h ?? '-'}  n=${r.after.n}`
	);
}

const checks = [
	['Motion Blur shows a rotation dial', s0.hasDial],
	['the angle slider is gone (only Distance / Edge Behavior left)', !s0.sliderLabels.some((l) => /angle/i.test(l))],
	['the dial reaches the requested angle each time', rows.every((r) => r.setTo.dial === r.D)],
	['Centered was switched off for the test', rows.every((r) => r.setTo.centered === false)],
	['the streak is real (dot smeared, more dark px)', rows.every((r) => r.after.n > base.n)],
	...rows.map((r) => [
		`dial ${String(r.D).padStart(3)}deg -> streak runs that way (dot ${r.dot.toFixed(2)})`,
		r.dot > 0.85
	]),
	['0deg is VERTICAL (not horizontal)', rows[0].after.h > rows[0].after.w * 1.5],
	['90deg is HORIZONTAL', rows[1].after.w > rows[1].after.h * 1.5]
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`\nbaseline dot n=${base.n}; errors : ${errors.length ? errors.join(' | ') : 'none'}`);
