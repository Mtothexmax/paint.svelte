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

**Read app state through the DOM.** The Svelte stores are not exposed on
`window`, so assert on a component that *renders* them. The colour slots are the
easy case: `.cs-fg .cs-fill` / `.cs-bg .cs-fill` carry
`background-color: rgbaToCss($foregroundColor)`, which includes alpha, so
`getComputedStyle(...).backgroundColor` is a faithful read of the store:
```js
const fg = () => page.evaluate(() => getComputedStyle(document.querySelector('.cs-fg .cs-fill')).backgroundColor);
// 'rgba(249, 27, 6, 0.5)' -> { r: 249, g: 27, b: 6, a: 128 }
```

**Double-click a control, including with the right button.** Do not rely on
`clickCount`; dispatch two quick down/up pairs and let the app's own
button+timestamp detector see them:
```js
const doubleClick = async (x, y, button) => {
  await page.mouse.move(x, y);
  for (let i = 0; i < 2; i++) { await page.mouse.down({ button }); await page.mouse.up({ button }); }
  await new Promise((r) => setTimeout(r, 250));
};
```
Always probe a **single** click too — a reset-on-double-click handler that fires
on ordinary clicks is the classic regression here.

**Read a Pixi-drawn overlay (the selection veil).** The blue selection veil is
painted in WebGL, so it is *not* in the DOM — no selector will find it. Recover
it from pixels instead: fill the layer with **black** first (so the veil's
composite colour is predictable), screenshot the canvas, then window the
colour.

`0x8fc7ff` at `alpha 0.32` over black → `rgb(46, 64, 82)`. A window of
`r 32–62, g 48–82, b 62–102` catches it and nothing else in the chrome (the UI
blue accents are `0x3b82f6` = `rgb(59, 130, 246)`, far outside on green).

```js
const clip = await page.evaluate(() => {
  const r = document.querySelector('div[style*="touch-action"]').getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});
const buf = await page.screenshot({ clip });
const found = await page.evaluate(async (arg) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + arg.data;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, count = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
    if (r >= 32 && r <= 62 && g >= 48 && g <= 82 && b >= 62 && b <= 102) {
      count++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return count ? { count, box: [minX + arg.ox, minY + arg.oy, maxX + arg.ox, maxY + arg.oy] } : { count, box: null };
}, { data: buf.toString('base64'), ox: clip.x, oy: clip.y });
```

`count` + the bounding box are enough to assert "the veil followed the drag"
(box centre moves with the gesture, `count` stays large) versus "the veil is
gone" (`count` ≈ 0) or "the veil is stale" (centre unmoved).

**Assert the gizmo is centred on the selection.** Read the drawn ring path
(`svg path[stroke="#4a90e2"]` is the Z ring), average its extremes → screen
centre; compare with the veil centre from the recipe above. They must agree to
within a few px.

**Read an effect dialog's shape.** Effects are registered from
`src/lib/effects/<menu>/<id>.ts`; `EffectParam.kind` is
`'slider' | 'color' | 'checkbox' | 'xy' | 'angle'`. Open one via the menubar and
read the control types straight off the DOM:
```js
const dialogShape = () => page.evaluate(() => {
  const d = document.querySelector('.m-dialog');
  if (!d) return null;
  return {
    title: d.querySelector('.m-title-text')?.textContent?.trim() ?? null,
    hasPad: !!d.querySelector('.xyp-pad'),        // xy param
    hasDial: !!d.querySelector('.ang-svg'),       // angle param
    sliderLabels: [...d.querySelectorAll('.fsl-label')].map((s) => s.textContent.trim()),
    xyFields: [...d.querySelectorAll('.xyp-num')].map((i) => Number(i.value)),
    dialValue: d.querySelector('.ang-num') ? Number(d.querySelector('.ang-num').value) : null
  };
});
```
Drive the pad with `page.mouse` at `pad.x + dx`, `pad.y + dy` and read `xyFields`
back. The `.m-dialog` is non-modal, so close it with `.m-dialog .m-close`.

## Gotchas that have cost real debugging time

- **A range input never reports a right-button value change.** Browsers ignore
  non-primary buttons on `input[type=range]`, so a right-click handler has to be
  driven from `pointerup` (`e.button === 2`) and apply the value itself — and
  `contextmenu` must be prevented, or the OS menu pops up over the control. The
  first click of a double click will already have moved the value, so the
  handler must *override* it rather than assume it is unchanged.
- **Tailwind v4 emits `oklch()` for utility colours.** `getComputedStyle` on an
  element with `bg-blue-500` reports `oklch(0.623 0.214 259.815)`, **not**
  `rgb(59, 130, 246)`. A probe that matches the computed colour finds nothing
  and aborts with a misleading "no draggers found". Match on the **class**
  (`div.bg-blue-500`) and filter by computed size instead.
- **The Move tool's pivot handle sits at the selection centre.** A probe drag
  started at the centre grabs the *pivot* and moves only that — the selection
  stays put and the test looks like a broken veil. Start content drags a good
  100 px off-centre.
- **`Deselect` has no top-level button** (it is Edit ▸ Deselect). Drive it with
  `Ctrl+D`, not `clickByText('Deselect')`, which silently clicks nothing.
- **`page.evaluate` cannot see the enclosing Node scope.** Referencing an outer
  `const clip` inside the callback throws `ReferenceError: clip is not defined`
  in the *page* context. Pass everything through the second argument:
  `page.evaluate(fn, { data, ox, oy })`.
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
- **An `xy` param needs BOTH defaults seeded, or the preview goes blank.** An
  `xy` param writes `settings[keyX]` and `settings[keyY]`; `registry.ts` derives
  `defaults` from the param list. If it only seeds `keyX`, the shader uniform gets
  `undefined` → NaN and the whole preview renders empty — which looks like a
  broken shader but is a defaults bug.
- **The XY pad (`.xyp-pad`) is a rounded rect — its literal corners are dead
  pixels.** `document.elementFromPoint` at the pad's corner returns the wrapper
  (`.xyp-body`), so a drag started there never begins and the values look frozen
  at their default (a probe drag to `pad.x + 1` silently did nothing). Probe each
  edge at its **midpoint** (`pad.x + 3, pad.y + pad.h / 2`, etc.); that also
  isolates one axis per drag, which is the clean way to prove the Y direction.
- **A shader's angle convention rarely matches a UI dial's.** Before wiring an
  `angle` param to `AnglePicker` (0 = up, clockwise), check the shader's own
  vector maths — e.g. Motion Blur uses `(-cos t, sin t)` in a y-down UV space, so
  its `t = 0` points LEFT. Re-anchor inside `filter()` (Motion Blur uses
  `90 - angle`) and then *prove the direction on pixels*, because the sign is
  easy to get backwards.
- **To measure a blur's direction, smear an isolated dot.** Put a black dot on a
  white layer, blur it with the directional control OFF-centre, and take the
  centroid shift of the darkened pixels — that shift is the streak direction.
  Two traps: (1) the streak is a light **grey**, not black (a 40px dot averaged
  over a ~115px streak bottoms out near 200/255), so a "pure black" threshold
  finds nothing; (2) the dark transparency checkerboard contains **pure black**
  squares (`#000000` on `#241f21`), indistinguishable from artwork — so measure
  inside a box known to lie wholly within the image.
- **A hover-driven submenu must not also toggle on click.** `MenuBar.svelte`'s
  submenu opens from `onpointerenter` on `.sub-holder`; if the header button's
  click *toggles* the same state, then the click you make while already hovering
  the header closes the submenu you just saw appear — one open/close flicker per
  click. Drive menus with **real** `page.mouse.move` (synthetic `mouseenter`
  does not fire `pointerenter`), assert the submenu's state **after every
  click**, and note that a naive "is it open after the last click?" check passes
  even when broken (an even number of toggles lands back on open).
- **A leading space inside `{#if}` is trimmed by the Svelte compiler.**
  `{x}{#if c} · suffix{/if}` renders as `(...)·suffix`. Use an entity (`&nbsp;·`)
  or an expression — entities are never trimmed. Worth checking in the probe's
  reported text, which is exactly how this surfaced.

## Definition of done

1. `npx tsc --noEmit -p tsconfig.json` → clean.
2. `npm run check` → **0 errors**; warnings must be at or below the standing
   baseline (**52 as of 2026-09-11**, down from 56). A *new* warning means a real
   defect (the `Unused CSS selector` case above was exactly that).
3. Probe prints the asserted values plus `errors: none`.
4. A screenshot of the changed UI, presented to the user.
5. Append a `-- DONE ... --` block to `todo2.txt` (project convention) and a note
   to `.workbuddy-ai/memory/YYYY-MM-DD.md`.
