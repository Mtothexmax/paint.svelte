// Verify the Mandelbrot-style controls were reused:
//   Zoom Blur            -> XY pad for the centre (no Center X/Y sliders)
//   Rotary/Radial/Twist  -> XY pad for the centre AND a rotation dial
// Plus: the pad's Y axis points DOWN (image space), the pad really moves the
// blur centre, and applying still renders (the xy param must seed `keyX`/`keyY`
// in `defaults`, or the uniform gets NaN).
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
const pickTool = async (l) => {
	await page.evaluate((x) => document.querySelector(`button[aria-label="${x}"]`)?.click(), l);
	await sleep(350);
};

/** Effects ▸ <sub> ▸ <leaf> */
const openEffect = async (sub, leaf) => {
	await page.evaluate(() => {
		[...document.querySelectorAll('.menubar-btn')].find((b) => b.textContent.trim() === 'Effects')?.click();
	});
	await sleep(250);
	await page.evaluate((s) => {
		[...document.querySelectorAll('.menu-panel .menu-item')].find((b) => b.textContent.includes(s))?.click();
	}, sub);
	await sleep(300);
	const opened = await page.evaluate((l) => {
		const b = [...document.querySelectorAll('.sub-panel .menu-item')].find((x) =>
			x.textContent.includes(l)
		);
		if (!b) return null;
		b.click();
		return b.textContent.trim();
	}, leaf);
	await sleep(700);
	return opened;
};

const dialogShape = () =>
	page.evaluate(() => {
		const d = document.querySelector('.m-dialog');
		if (!d) return null;
		return {
			title: d.querySelector('.m-title-text')?.textContent?.trim() ?? null,
			hasPad: !!d.querySelector('.xyp-pad'),
			hasDial: !!d.querySelector('.ang-svg'),
			padLabel: d.querySelector('.xyp-label')?.textContent?.trim() ?? null,
			dialLabel: d.querySelector('.ang-label')?.textContent?.trim() ?? null,
			sliderLabels: [...d.querySelectorAll('.fsl-label')].map((s) => s.textContent.trim()),
			xyFields: [...d.querySelectorAll('.xyp-num')].map((i) => Number(i.value)),
			dialValue: d.querySelector('.ang-num') ? Number(d.querySelector('.ang-num').value) : null,
			dialMin: d.querySelector('.ang-num')?.getAttribute('min') ?? null,
			dialMax: d.querySelector('.ang-num')?.getAttribute('max') ?? null,
			xyMin: [...d.querySelectorAll('.xyp-num')].map((i) => `${i.getAttribute('min')}..${i.getAttribute('max')}`)
		};
	});
const closeDialog = async () => {
	await page.evaluate(() => document.querySelector('.m-dialog .m-close')?.click());
	await sleep(400);
};

// ---- document: white layer with a hard black rectangle --------------------
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await sleep(1600);
await pickTool('Paint Bucket');
await page.mouse.move(650, 450);
await page.mouse.down({ button: 'right' }); // right button -> background (white)
await page.mouse.up({ button: 'right' });
await sleep(900);
await pickTool('Rectangle Select');
await page.mouse.move(430, 300);
await page.mouse.down();
await page.mouse.move(620, 450, { steps: 12 });
await page.mouse.up();
await sleep(400);
await pickTool('Paint Bucket');
await page.mouse.move(520, 380);
await page.mouse.down(); // left button -> foreground (black)
await page.mouse.up();
await sleep(900);
await page.keyboard.down('Control');
await page.keyboard.press('d');
await page.keyboard.up('Control');
await sleep(500);

// ---- 1. dialog shapes -----------------------------------------------------
const results = [];
for (const [sub, leaf, want] of [
	['Blurs', 'Zoom Blur', { pad: true, dial: false }],
	['Blurs', 'Rotary Blur', { pad: true, dial: true }],
	['Blurs', 'Radial Blur', { pad: true, dial: true }],
	['Blurs', 'Motion Blur', { pad: false, dial: true }],
	['Distort', 'Twist', { pad: true, dial: true }]
]) {
	const opened = await openEffect(sub, leaf);
	const shape = await dialogShape();
	results.push({ leaf, opened, want, shape });
	await closeDialog();
}

// ---- 2. the pad drives the centre, and Y points DOWN ---------------------
await openEffect('Blurs', 'Zoom Blur');
const pad = await page.evaluate(() => {
	const b = document.querySelector('.xyp-pad').getBoundingClientRect();
	const hit = (dx, dy) => {
		const e = document.elementFromPoint(b.x + dx, b.y + dy);
		return e ? `${e.tagName}.${String(e.className).split(' ')[0]}` : 'null';
	};
	return {
		x: b.x,
		y: b.y,
		w: b.width,
		h: b.height,
		hits: { p0: hit(0, 0), p1: hit(1, 1), p3: hit(3, 3), p5: hit(5, 5), p8: hit(8, 8) }
	};
});
console.log(`pad geometry : ${pad.w}x${pad.h} @ (${pad.x}, ${pad.y})`);
const dragPad = async (fx, fy) => {
	await page.mouse.move(pad.x + pad.w * fx, pad.y + pad.h * fy);
	await page.mouse.down();
	await page.mouse.move(pad.x + pad.w * fx, pad.y + pad.h * fy, { steps: 4 });
	await page.mouse.up();
	await sleep(350);
};
/** Drag to an exact pixel offset inside the pad — used for the true edges. */
const dragPadPx = async (dx, dy) => {
	await page.mouse.move(pad.x + dx, pad.y + dy);
	await page.mouse.down();
	await page.mouse.move(pad.x + dx, pad.y + dy, { steps: 4 });
	await page.mouse.up();
	await sleep(350);
};
// The pad is a rounded rect, so its literal corners fall outside the hit
// shape; probe each edge at its MIDPOINT to isolate one axis at a time.
const EDGE = 3; // px inset that is safely inside the rounded corner
await dragPadPx(EDGE, pad.h / 2); // left edge
const padLeft = await dialogShape();
await dragPadPx(pad.w - EDGE, pad.h / 2); // right edge
const padRight = await dialogShape();
await dragPadPx(pad.w / 2, EDGE); // top edge
const padTop = await dialogShape();
await dragPadPx(pad.w / 2, pad.h - EDGE); // bottom edge
const padBottom = await dialogShape();

// ---- 3. apply with the centre moved: does it still render? ---------------
const clip = await page.evaluate(() => {
	const r = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
	return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});
const readRow = async (tag) => {
	const buf = await page.screenshot({ clip });
	if (tag) await page.screenshot({ path: `${OUT}fx-${tag}.png`, clip });
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
			// sample a horizontal line just above the black rect's top edge
			const y = Math.round(arg.y);
			const out = [];
			for (let x = 40; x < c.width - 40; x += 4) {
				const i = (y * c.width + x) * 4;
				out.push([px[i], px[i + 1], px[i + 2]]);
			}
			return out;
		},
		{ data: buf.toString('base64'), y: 250 - clip.y }
	);
};

const before = await readRow('before');
// move the pad to the top-left of the picture, crank the amount up
await dragPad(0.12, 0.12);
await page.evaluate(() => {
	const d = document.querySelector('.m-dialog');
	const r = d.querySelector('.fsl-range');
	Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(r, '60');
	r.dispatchEvent(new Event('input', { bubbles: true }));
});
await sleep(400);
await page.evaluate(() => {
	[...document.querySelectorAll('.m-footer button')].find((b) => b.textContent.includes('Apply'))?.click();
});
await sleep(1000);
const after = await readRow('applied');

await browser.close();

// ---- report ---------------------------------------------------------------
console.log('--- dialog shapes ---');
for (const r of results) {
	const s = r.shape;
	console.log(
		`${r.leaf.padEnd(12)} opened=${String(r.opened).padEnd(14)} pad=${s?.hasPad} dial=${s?.hasDial} ` +
			`sliders=[${s?.sliderLabels.join(', ')}] padLabel=${s?.padLabel} dial=${s?.dialValue} (${s?.dialMin}..${s?.dialMax}) xy=${s?.xyFields} range=${s?.xyMin}`
	);
}
console.log('\npad left edge   :', padLeft.xyFields, '  right edge :', padRight.xyFields);
console.log('pad top edge    :', padTop.xyFields, '  bottom edge:', padBottom.xyFields);

const diff = before.reduce(
	(n, p, i) => n + (Math.abs(p[0] - after[i][0]) + Math.abs(p[1] - after[i][1]) + Math.abs(p[2] - after[i][2]) > 12 ? 1 : 0),
	0
);
console.log(`\nscanline samples : ${before.length}`);
console.log(`changed after Apply : ${diff}`);

const byTitle = Object.fromEntries(results.map((r) => [r.leaf, r.shape]));
const checks = [
	['Zoom Blur uses the XY pad', !!byTitle['Zoom Blur']?.hasPad],
	['Zoom Blur has no Center X/Y sliders', !byTitle['Zoom Blur']?.sliderLabels.some((l) => /Center/i.test(l))],
	['Zoom Blur has no dial (no angle param)', !byTitle['Zoom Blur']?.hasDial],
	['Rotary Blur uses pad + dial', !!byTitle['Rotary Blur']?.hasPad && !!byTitle['Rotary Blur']?.hasDial],
	['Radial Blur uses pad + dial', !!byTitle['Radial Blur']?.hasPad && !!byTitle['Radial Blur']?.hasDial],
	['Twist uses pad + dial', !!byTitle['Twist']?.hasPad && !!byTitle['Twist']?.hasDial],
	['Motion Blur uses the dial, not a pad', !byTitle['Motion Blur']?.hasPad && !!byTitle['Motion Blur']?.hasDial],
	['no "Angle" slider left anywhere', !results.some((r) => r.shape?.sliderLabels.some((l) => /^angle$/i.test(l)))],
	['no Center X/Y sliders left anywhere', !results.some((r) => r.shape?.sliderLabels.some((l) => /Center/i.test(l)))],
	['pad left edge -> x=0', padLeft.xyFields[0] <= 4],
	['pad right edge -> x=100', padRight.xyFields[0] >= 96],
	['pad top edge -> y=0  [Y points DOWN]', padTop.xyFields[1] <= 4],
	['pad bottom edge -> y=100', padBottom.xyFields[1] >= 96],
	['Apply renders a real blur (canvas changed)', diff > 3],
	['no NaN in the preview (white stays white)', after.some((p) => p[0] > 245 && p[1] > 245 && p[2] > 245)]
];
console.log('');
for (const [n, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`);
console.log(`\nerrors : ${errors.length ? errors.join(' | ') : 'none'}`);
