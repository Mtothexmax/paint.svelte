// Temporary diagnostic: serve docs/ under /paint.svelte and load it in
// headless Chrome, collecting console + page errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve('docs');
const port = Number(process.argv[2] ?? 4321);
const types = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.txt': 'text/plain',
	'.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
	let url = decodeURIComponent((req.url ?? '/').split('?')[0]);
	if (url.startsWith('/paint.svelte')) url = url.slice('/paint.svelte'.length) || '/';
	let file = path.join(root, url);
	if (!file.startsWith(root)) {
		res.writeHead(403).end();
		return;
	}
	if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
	if (!fs.existsSync(file)) {
		res.writeHead(404).end('not found');
		return;
	}
	res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
	fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(port, '127.0.0.1', r));

const puppeteer = (await import('puppeteer-core')).default;
const browser = await puppeteer.launch({
	executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	headless: 'new',
	args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => {
	if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url()}`);
});

await page.goto(`http://127.0.0.1:${port}/paint.svelte/`, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

console.log('=== console / errors ===');
for (const l of logs) console.log(l);
console.log('=== end ===');

await browser.close();
server.close();
