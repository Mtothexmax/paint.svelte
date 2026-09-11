---
name: paint-verify-ui
description: Verify a UI change in the paint.svelte app (C:/dev/paint.svelte) by driving the running Vite dev server with puppeteer-core — asserting on real DOM/computed-style values and capturing screenshots. Use this whenever a change touches Svelte components, canvas overlays, dialogs, panels or the status bar and you need proof it works (or to reproduce a user-reported visual bug) instead of guessing from the source.
---

# Verifying UI changes in paint.svelte

Drive the app with `puppeteer-core` against the dev server, assert on real DOM
values, and screenshot. Every non-trivial UI change in this project has been
verified this way — the app is a canvas/GPU app where "it looks right in the
source" is routinely wrong.

## Environment

| Thing | Value |
|---|---|
| Dev server | `http://localhost:5173/` (a second instance sometimes on 5174) |
| Node | `C:/Users/mtoth/.workbuddy-ai/binaries/node/versions/22.22.2-2/node.exe` |
| Chrome | `C:/Program Files/Google/Chrome/Application/chrome.exe` |
| `puppeteer-core` | in `node_modules` (v25.x) but **not** in `package.json` — do not "fix" that |
| Probe scripts | `.workbuddy-ai/*.mjs`, screenshots `.workbuddy-ai/*.png` |

Check the server first: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/`
→ `200` means it is up. Start it with `npm run dev` (background) if not.

## Harness template

```js
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
await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));   // WebGL + stores settle

// ...drive the app...

await browser.close();
console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`);
```

Run it with the managed node:
```
"C:/Users/mtoth/.workbuddy-ai/binaries/node/versions/22.22.2-2/node.exe" .workbuddy-ai/<probe>.mjs
```

**Always report the console-error list.** Zero errors is part of the evidence.

## Standard recipes

**Create a document.** The start screen's New dialog:
```js
const clickByText = async (t) => {
  await page.evaluate((x) => {
    const b = [...document.querySelectorAll('button')].find((y) => (y.textContent ?? '').includes(x));
    b?.click();
  }, t);
  await new Promise((r) => setTimeout(r, 450));
};
await clickByText('New…'); await clickByText('SVGA'); await clickByText('Create');
await new Promise((r) => setTimeout(r, 1600));
```
`SVGA` = 800×600. Other presets sit next to it in the same dialog.

**Pick a tool** — buttons carry `aria-label`:
```js
await page.evaluate(() => document.querySelector('button[aria-label="Rectangle Select"]')?.click());
```
Known labels: `Paintbrush`, `Paint Bucket`, `Rectangle Select`, `Move Selected
Pixels`, `Zoom`, `Pan`.

**Pick a sub-mode** — the options strip uses `.seg-btn`, and the label carries an
icon prefix, so match with `includes`, never `===`:
```js
await page.evaluate(() => {
  [...document.querySelectorAll('.seg-btn')].find((x) => x.textContent.includes('Rotate'))?.click();
});
```
Read the current one back via `document.querySelectorAll('.seg-btn.on')`.

**Set a number input bound with Svelte `bind:value`** — plain `el.value = x` does
not notify Svelte:
```js
await page.evaluate((i, v) => {
  const el = document.querySelectorAll('.dims input')[i];
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, 0, 400);
```

**Screenshot a specific element / region.**
```js
const el = await page.$('.dialog');
await el.screenshot({ path: OUT + 'shot.png' });
// or a clipped page region:
await page.screenshot({ path: OUT + 'crop.png', clip: { x: 0, y: 590, width: 900, height: 310 } });
```

**Drag on the canvas.** `page.mouse.move/down/move/up` with CSS page coords. To
screenshot *mid*-drag, simply skip the `up()` until after the screenshot.

**Read the status bar** (image size / selection size / pointer):
```js
await page.evaluate(() => document.querySelector('.status-strip').textContent.replace(/\s+/g, ' ').trim());
```

**Observe engine internals.** Transform/rotate code logs to `localStorage`
(`logTransformDebug`, key contains `transform`) *and* `console.debug('[transform]')`.
Reading the stored array is the reliable way to prove a gesture fired:
```js
const arr = JSON.parse(localStorage.getItem(<key containing 'transform'>));
// count by e.event — e.g. engine.rotateRingTo vs engine.transformTo
```

**Add a dialog.** Three touches, in order: add the kind to `DialogKind` in
`services/dialogService.ts`, write the component against
`components/common/MovableDialog.svelte` (`title`, `onClose`, `width`, plus an
`actions` snippet for the footer — it already handles Esc, drag-to-move and the
close button), then mount it in `DialogHost.svelte`. `MovableDialog` is
**non-modal** (no backdrop) — use it whenever the canvas should stay visible and
interactive, and add your own Enter-to-apply if the dialog is a form.

**Read a non-modal popup back** in a probe via `.m-dialog`, `.m-title-text`,
`.m-footer button`, and your own body classes.

## Gotchas that have cost real debugging time

- **Headless Chrome never emits a real `paste` event from Ctrl+V.** Paste
  verification *must* use `headless: false`, and `navigator.clipboard.write`
  from `page.evaluate` needs the window foreground
  (`NotAllowedError: Document is not focused`) — retry after
  `page.bringToFront()` + a real click.
- **Headless Chrome uses overlay scrollbars**, so `scrollWidth > clientWidth`
  overflow bugs are not reproducible. Verify the fix by measuring
  `clientWidth === scrollWidth` at a forced narrow width instead.
- **SVG overlay paths are in SVG-LOCAL coordinates.** An overlay is usually
  `absolute inset-0` inside the canvas host, so add
  `path.ownerSVGElement.getBoundingClientRect()` before feeding points to
  `page.mouse.move()`. Skip this and drags land beside the target and silently
  do something else.
- **Material Symbols SVGs ship with no `fill`** → solid black → invisible on the
  dark chrome. Import `?raw` + `{@html}` and colour with `fill: currentColor`.
- **A scoped Svelte `<style>` rule cannot match `{@html}` children.** svelte-check
  reports it as *"Unused CSS selector"*. Use `:global()` (or the global
  `layout.css`).
- **Scope selectors to the dialog.** `document.querySelectorAll('input[type=checkbox]')`
  page-wide picks up the layers-panel visibility boxes.
- **Svelte 5 `$state` flags are read at drag time**, so a probe must actually
  perform the pointer gesture — dispatching synthetic events often will not do.
- **A leading space inside `{#if}` is trimmed by the Svelte compiler.**
  `{x}{#if c} · suffix{/if}` renders as `(...)·suffix`. Use an entity (`&nbsp;·`)
  or an expression — entities are never trimmed. Worth checking in the probe's
  reported text, which is exactly how this surfaced.

## Definition of done

1. `npx tsc --noEmit -p tsconfig.json` → clean.
2. `npm run check` → **0 errors**; warnings must be at or below the standing
   baseline (56 as of 2026-09-11). A *new* warning means a real defect (the
   `Unused CSS selector` case above was exactly that).
3. Probe prints the asserted values plus `errors: none`.
4. A screenshot of the changed UI, presented to the user.
5. Append a `-- DONE ... --` block to `todo2.txt` (project convention) and a note
   to `.workbuddy-ai/memory/YYYY-MM-DD.md`.
