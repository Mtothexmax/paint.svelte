// The three read-outs gained ~19 px each. Check the strip survives a narrow
// window: nothing wraps, the zoom bar stays on screen and reachable.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});

for (const width of [1400, 1100, 900, 760]) {
	const page = await browser.newPage();
	await page.setViewport({ width, height: 820, deviceScaleFactor: 1 });
	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
	await new Promise((r) => setTimeout(r, 2200));

	const clickByText = async (t) => {
		await page.evaluate((x) => {
			const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
			b?.click();
		}, t);
		await new Promise((r) => setTimeout(r, 400));
	};
	await clickByText('New…');
	await clickByText('SVGA');
	await clickByText('Create');
	await new Promise((r) => setTimeout(r, 1400));

	await page.evaluate(() => document.querySelector('button[aria-label="Rectangle Select"]')?.click());
	await new Promise((r) => setTimeout(r, 300));
	await page.mouse.move(420, 360);
	await page.mouse.down();
	await page.mouse.move(600, 500, { steps: 10 });
	await new Promise((r) => setTimeout(r, 350));

	const m = await page.evaluate(() => {
		const strip = document.querySelector('.status-strip');
		const bar = document.querySelector('.zoombar');
		const pct = bar?.querySelector('.zb-pct');
		const sb = strip.getBoundingClientRect();
		const bb = bar.getBoundingClientRect();
		const pb = pct.getBoundingClientRect();
		const readouts = [...strip.querySelectorAll('.sb-read, .status-dim')].map((n) =>
			Math.round(n.getBoundingClientRect().width)
		);
		return {
			stripH: Math.round(sb.height),
			stripScroll: strip.scrollWidth,
			stripClient: strip.clientWidth,
			readoutWidths: readouts,
			zoomRight: Math.round(bb.right),
			pctRight: Math.round(pb.right),
			pctText: pct.textContent.trim(),
			viewport: window.innerWidth,
			barOverflow: getComputedStyle(strip).overflow
		};
	});
	await page.mouse.up();
	await page.close();

	const fits = m.zoomRight <= m.viewport + 1 && m.pctRight <= m.viewport + 1;
	console.log(
		`w=${String(width).padEnd(5)} stripH=${m.stripH} scroll=${m.stripScroll}/${m.stripClient} ` +
			`readouts=[${m.readoutWidths.join(',')}] zoomRight=${m.zoomRight} pct="${m.pctText}"@${m.pctRight} ` +
			`fits=${fits} errors=${errors.length || 'none'}`
	);
}

await browser.close();
