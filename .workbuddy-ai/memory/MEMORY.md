# paint.svelte — project memory

Curated, long-lived notes. Daily detail lives in `YYYY-MM-DD.md`.

## What this is

SvelteKit 2 + Svelte 5 (runes) + Pixi.js v8 paint application.
App is served under the **`/paint.svelte/` base path** (`vite.config.ts` →
`paths.base`). The bare root 302-redirects and can 500 in dev — always probe
`http://localhost:5173/paint.svelte/`.

## ⚠️ Git: avoid MUTATING commands here

This working copy is **shared with other AI tools** — `.git/refs/agents/…`,
`.git/refs/codex`, `.git/cursor` and `.git/opencode` have all been present. On
2026-09-22 the entire `.git/objects` store (loose *and* packed) vanished
mid-session while other tools were live and git began reporting "not a git
repository". It was fully recovered from the remote in the same session — see
`.workbuddy-ai/memory/2026-09-22.md` §9–10 for the whole incident and the
step-by-step repair. Prefer read-only git (`status`, `diff`, `ls-remote`);
avoid `stash` / `gc` / `reset` / `checkout` so you don't race another agent.

Remote: `https://github.com/Mtothexmax/paint.svelte.git`.
**Current state:** `main` = `origin/main` = `cf9806c`; `git fsck` clean. The last
local commit `0c961729` ("added ai model downloader") no longer exists as a
commit — its content is intact in the working tree but unstaged.

**Recovery recipe, if it ever happens again** (each step was blocked by the
previous one, so the order matters):

1. `mkdir -p .git/objects` — this alone clears "not a git repository".
2. `git for-each-ref` and `git cat-file -e <sha>` each ref; a single dangling ref
   **blocks every fetch**. `git update-ref -d <ref>` it.
3. `git fetch origin`.
4. If the fetch's ref write doesn't land, `mkdir -p .git/refs/heads
   .git/refs/remotes/origin` first — git needs the parent dir to exist, and
   fails **silently** otherwise.
5. `rm .git/index` **then** `git reset --mixed HEAD`. The index is what breaks
   committing after object loss, and `git reset` alone fails reading it.
6. If fsck reports `invalid reflog entry`, `grep -v` just the offending SHA out
   of `.git/logs/HEAD` and `.git/logs/refs/heads/main` — do **not**
   `git reflog expire`, it destroys the whole valid history.

Always checksum the sources before and after to prove the working tree survived.

## Tooling hazards

- **Never issue two `Edit` calls against the SAME file in one message.** Each
  `Edit` rewrites the whole file, so concurrent calls race and one change is
  silently lost — both still report success. Parallel edits across *different*
  files are fine. Grep to confirm after any batched edit.
- Windows file locks can throw `EBUSY` on `Edit`; just retry.

## Definition of done

1. `npx tsc --noEmit -p tsconfig.json` → clean.
2. `npm run check` → **0 errors**, warnings ≤ **54** (standing baseline).
3. A probe in `scripts/` printing the asserted values plus `errors: none`.
4. A screenshot of the changed UI, presented to the user.
5. Append a `-- DONE --` block to `todo2.txt` and a note to
   `.workbuddy-ai/memory/YYYY-MM-DD.md`.

Probes: `puppeteer-core` + `C:/Program Files/Google/Chrome/Application/chrome.exe`,
node at `C:/Users/mtoth/.workbuddy-ai/binaries/node/versions/22.22.2-2/node.exe`,
flags `--no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader`.
Full recipe: the `paint-verify-ui` skill.

## Design language (the "Claude" chrome)

One ramp in `src/routes/layout.css` `:root`; legacy neutral tokens are aliases.
`--border` is a **black SEAM, not a line** — invisible on dark. Anything drawing
a *visible* hairline must use `--line` / `--line-strong`.

**The recessed-well recipe** — the one treatment for every editable/inset
surface (slider tracks `.fsl-well`, `.field input`, `.cp-num input`,
`.cp-hexfield input`, the zoom slider track):

```css
background: linear-gradient(to bottom, #0b0c0e, #131519);
border: none;
box-shadow:
	0 3px 7px rgba(0, 0, 0, 0.85) inset,
	0 -1px 0 rgba(255, 255, 255, 0.075),
	0 0 0 1px rgba(0, 0, 0, 0.8);
```

**The raised-plate recipe** for buttons (`.fsl-step`, `.preset-chip`,
`.m-footer .btn-secondary`): `linear-gradient(to bottom, #3a3e45, #272a2f)` +
`1px solid rgba(0,0,0,.65)` + `0 1px 0 rgba(255,255,255,.13) inset`.

**The chrome-bar recipe** for any header/title band (`.m-title`,
`.color-mode-head`):

```css
background: linear-gradient(180deg, #34383f, #22252a);
border-bottom: 1px solid rgba(0, 0, 0, 0.55);
box-shadow: 0 1px 0 rgba(255, 255, 255, 0.075) inset;
```

A **flat** `var(--bg-elev)` / `var(--chrome-hi)` band is the classic near-miss
here: the rule and the inset highlight look right in isolation, but without the
gradient the bar reads as unstyled next to a real dialog title. Title metric is
**12.5px/600 + `letter-spacing: .02em`**.

Focus: `outline: none` + `0 0 0 2px var(--accent-ring)` (`#6fd4ff`).
Never `background: var(--bg)` + `var(--border)` on a chrome plate — that pairing
is what made dialogs' text fields read as flat black holes.

**CSS specificity trap:** the global `.btn-primary:hover:not(:disabled)` is
**(0,3,0)** — `:not()` contributes its argument's specificity. A single-class
`.foo:hover` `(0,2,0)` loses to it, so a global `filter: brightness(1.1)` stacks
on top of your hover gradient. Override with a **two-class** selector
(`.parent .foo:hover`) plus an explicit `filter: none`.

## Architecture notes

- Effects: `src/lib/effects/<menu>/<id>.ts` default-exports an `EffectDefinition`;
  `import.meta.glob` auto-registers; `registry.ts` derives defaults from `params`.
- `EffectDialog.svelte` and `LayerEffectDialog.svelte` each carry their **own copy**
  of the `{#if param.kind === …}` chain — a new `EffectParam.kind` needs both.
- The menubar's on-screen order **is** the `MENUS` array order in
  `src/lib/services/menuService.ts` (`MenuBar.svelte` renders `{#each MENUS}`).
- Every modal is a `MovableDialog` (`.m-dialog`). The old `.dialog*` CSS in
  `layout.css` is dead (0 references) and worth deleting.
