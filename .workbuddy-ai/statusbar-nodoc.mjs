// Start screen (no document): the strip must render no read-outs at all.
import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(process.argv[2] ?? 'http://localhost:5173/', {
	waitUntil: 'domcontentloaded',
	timeout: 60000
});
await new Promise((r) => setTimeout(r, 2500));
const info = await page.evaluate(() => {
	const s = document.querySelector('.status-strip');
	return {
		text: (s.textContent ?? '').replace(/\s+/g, ' ').trim(),
		icons: s.querySelectorAll('.sb-ic').length,
		readouts: s.querySelectorAll('.sb-read, .status-dim').length
	};
});
await browser.close();
console.log(`text     : "${info.text}"`);
console.log(`icons    : ${info.icons}`);
console.log(`readouts : ${info.readouts}`);
console.log(`errors   : ${errors.length ? errors.join(' | ') : 'none'}`);
