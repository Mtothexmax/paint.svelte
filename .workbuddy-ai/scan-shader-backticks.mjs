// Scan every effect module for a backtick that appears INSIDE a shader template
// literal. The GLSL sources are JS template strings, so a backtick in a comment
// there closes the string early and Vite fails to parse the module. That exact
// mistake broke object/outline.ts once; this guard catches it statically.
//
// Written without any literal backtick in this file's own source (BT is built
// from its char code) so the scanner can never be confused by its own text.
import fs from 'node:fs';
import path from 'node:path';

const BT = String.fromCharCode(96);
const ROOT = 'C:/dev/paint.svelte/src/lib/effects';

function walk(dir, out) {
	out = out || [];
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p, out);
		else if (p.endsWith('.ts')) out.push(p);
	}
	return out;
}

const files = walk(ROOT);
let bad = 0;
let templates = 0;

for (const file of files) {
	const lines = fs.readFileSync(file, 'utf8').split('\n');
	const rel = path.relative('C:/dev/paint.svelte', file).split(path.sep).join('/');
	let inTemplate = false;
	let openLine = 0;

	for (let i = 0; i < lines.length; i++) {
		const ln = lines[i];
		const ticks = ln.split(BT).length - 1;

		if (!inTemplate) {
			// An odd tick count means a template literal opened on this line and
			// did not close here (the shader sources always open on their own).
			if (ticks % 2 === 1) {
				inTemplate = true;
				openLine = i + 1;
				templates++;
			}
			continue;
		}

		if (ticks === 0) continue;

		// Inside the template the ONLY legal tick is the closer, and it has to
		// be the last non-whitespace character (optionally followed by ';').
		const stripped = ln.trim().replace(/;$/, '').trim();
		if (stripped === BT) {
			inTemplate = false;
			continue;
		}

		bad++;
		console.log('FAIL ' + rel + ':' + (i + 1) + '  tick inside the template opened at line ' + openLine);
		console.log('     ' + ln.trim());
	}

	if (inTemplate) {
		bad++;
		console.log('FAIL ' + rel + '  template opened at line ' + openLine + ' never closed');
	}
}

console.log('');
console.log('scanned ' + templates + ' template literal(s) in ' + files.length + ' effect modules');
console.log(bad ? bad + ' problem(s)' : 'PASS  no stray tick inside any shader template');
process.exit(bad ? 1 : 0);
