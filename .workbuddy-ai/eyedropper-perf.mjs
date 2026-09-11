// How expensive is one live sample? (It runs on pointer move, throttled.)
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const clickByText = async (t) => {
	await page.evaluate((x) => {
		const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
		b?.click();
	}, t);
	await new Promise((r) => setTimeout(r, 450));
};
await clickByText('New…');
await clickByText('SVGA');
await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));

async function bench(label, extraLayers) {
	if (extraLayers) {
		await page.evaluate((n) => {
			const b = [...document.querySelectorAll('button')].find((x) => x.title === 'Add layer');
			for (let i = 0; i < n; i++) b?.click();
		}, extraLayers);
		await new Promise((r) => setTimeout(r, 1200));
	}
	const res = await page.evaluate(async () => {
		const er = await import('/src/lib/render/EditorRenderer.ts');
		const reg = await import('/src/lib/core/document/registry.ts');
		const ed = await import('/src/lib/render/eyedropper.ts');
		const renderer = er.getEditorRenderer();
		const doc = reg.documentRegistry.active;
		if (!doc) return { error: 'no doc' };
		const probe = () => ed.sampleCompositeColorAt(renderer, doc, 137, 211);
		probe();
		probe(); // warm up
		const N = 60;
		const t0 = performance.now();
		let last = null;
		for (let i = 0; i < N; i++) last = probe();
		const t1 = performance.now();
		return {
			layers: doc.layers.length,
			docSize: `${doc.width}x${doc.height}`,
			msPerSample: +((t1 - t0) / N).toFixed(3),
			sample: last
		};
	});
	console.log(label, JSON.stringify(res));
}

await bench('1 layer :', 0);
await bench('6 layers:', 5);

await browser.close();
