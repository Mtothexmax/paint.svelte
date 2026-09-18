// Diagnostic: load the app and report what the page actually contains.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({
	executablePath: CHROME,
	headless: true,
	args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e}`));
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()} :: ${r.failure()?.errorText}`));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 6000));
const info = await page.evaluate(() => ({
	title: document.title,
	menubarBtns: [...document.querySelectorAll('.menubar-btn')].map((b) => b.textContent.trim()),
	buttons: [...document.querySelectorAll('button')].slice(0, 25).map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 30)),
	bodyLen: document.body.innerHTML.length,
	bodyHead: document.body.innerHTML.slice(0, 600)
}));
console.log('title        :', info.title);
console.log('menubarBtns  :', JSON.stringify(info.menubarBtns));
console.log('bodyLen      :', info.bodyLen);
console.log('buttons      :', JSON.stringify(info.buttons, null, 1));
console.log('--- logs ---');
console.log(logs.slice(0, 30).join('\n') || '(none)');
console.log('--- body head ---');
console.log(info.bodyHead);
await browser.close();
