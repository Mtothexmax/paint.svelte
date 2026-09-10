import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('docs');
const port = 4323;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
	let url = decodeURIComponent((req.url ?? '/').split('?')[0]);
	if (url.startsWith('/paint.svelte')) url = url.slice('/paint.svelte'.length) || '/';
	let file = path.join(root, url);
	if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
	if (!fs.existsSync(file)) { res.writeHead(404).end('nf'); return; }
	res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
	fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(port, '127.0.0.1', r));

const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({
	executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	headless: 'new',
	args: ['--no-sandbox', '--enable-unsafe-swiftshader']
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 950 });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) errs.push(`[http ${r.status()}] ${r.url()}`); });

await page.goto(`http://127.0.0.1:${port}/paint.svelte/`, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 3000));

const text = await page.evaluate(() => document.body.innerText.slice(0, 4000));
await page.screenshot({ path: '.workbuddy-ai/shot.png' });
console.log('=== errors ===');
console.log(errs.length ? errs.join('\n') : '(none)');
console.log('=== page text (first 1200) ===');
console.log(text.slice(0, 1200));
await browser.close();
server.close();
