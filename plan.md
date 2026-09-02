Kurzer Hinweis vorab: Da Svelte, Tailwind und die Fluent-Emoji-Icon-Bibliothek bei dir bereits installiert sind, fällt die Dependency-Liste entsprechend kurz aus — **PixiJS ist die einzige wirklich neue Abhängigkeit**. Der Plan selbst ist auf Engluscht… pardon, auf Englisch gehalten, da er direkt als Prompt/Referenz für DeepSeek Flash dienen soll. Los geht's:

pixi.js habe ich auch schon installiert.

---

# Paint.NET-inspired Browser Image Editor — Architecture & Development Plan

**Prepared for implementation by DeepSeek Flash · Stack: Svelte + Tailwind (installed) + Fluent UI Emoji icons (installed) + PixiJS (to install) + TypeScript**

---

# 1. Executive Summary

The editor is built as a **three-layer architecture** with a strict seam between layers:

1. **Svelte layer** — application shell only (menu bar, tabs, toolbar, panels, dialogs). Svelte renders *mirrors* of state; it never owns editor state.
2. **Domain layer** — framework-free TypeScript classes (`ImageDocument`, layers, selection, `HistoryStack`, commands, tools). No Svelte, no Pixi imports.
3. **Render layer** — a single PixiJS v8 `Application` with one `DocScene` per open document. Pixels live **GPU-resident** in `RenderTexture`s, referenced by opaque IDs (`SurfaceId`) so the domain layer never touches Pixi.

Key technical choices:

- **GPU-first painting**: brush strokes are stamped into a pooled stroke-buffer `RenderTexture` and composited onto the layer texture at pointer-up. No per-event texture uploads, no CPU painting, no readbacks.
- **Hybrid history**: Command Pattern for metadata operations (layers, selection); region-surface snapshots (GPU→GPU copies of only the dirty rect) for raster operations, with a per-document memory budget and eviction.
- **Plugin-shaped built-ins**: adjustments/effects/tools are registered through one small registry API; built-ins (Blur, Sharpen, Brightness…) use exactly this path.
- **11 small vertical slices**, each runnable and manually testable. Slice 1 already produces a working image viewer with the full Paint.NET-style shell, tabs, zoom/pan, and PNG export.

Only two new npm dependencies across the entire MVP: `pixi.js` (Slice 1) and `pixi-filters` (Slice 6). Everything else uses native browser APIs.

---

# 2. Key Architecture Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| A1 | **PixiJS v8, forced WebGL** (`preference: 'webgl'`) | v8 is the current major (v8.x), actively maintained, and its renderer abstraction is what makes a later WebGPU experiment a config change, not a rewrite. Forcing WebGL avoids accidental WebGPU pickup in the MVP. |
| A2 | **Pixels are GPU-resident** (one `RenderTexture` per raster layer) | Avoids the classic mistake of keeping `ImageData` as the primary copy (doubles memory, forces full uploads per edit). CPU readback is an explicit, rare, justified operation. |
| A3 | **`SurfaceId` indirection** — domain/history reference surfaces by ID; the render layer maps IDs to Pixi textures | Keeps `core/` Pixi-free and testable; makes a WebGPU/portable backend a drop-in replacement of `SurfaceStore`. |
| A4 | **Stroke-buffer brush pipeline** (stamped sprites → pooled stroke `RenderTexture` → composite at commit) | Correct Paint.NET-like opacity semantics (one stroke = one opacity), cheap undo, zero full-layer uploads per event. Validated pattern in the Pixi community. |
| A5 | **Command Pattern + region snapshots** for history | Metadata ops cost ~zero bytes; raster ops cost $2 \times$ dirty-rect bytes instead of $2 \times$ full-layer bytes. Memory budget prevents runaway GPU usage. |
| A6 | **One Pixi `Application`, one `DocScene` per document**; tab switch = detach/attach scene root | Inactive documents keep textures alive (requirement) at near-zero cost; no renderer churn. |
| A7 | **Per-document viewport state** (`zoom`, `pan`) lives on the domain document | Required behavior (independent zoom per tab) falls out naturally. |
| A8 | **`CommandRegistry` is the single source for menus, shortcuts, and enable/disable** | Menu labels, shortcuts, and availability are defined once; context-awareness (e.g., "no document open") comes from `enabled` predicates. |
| A9 | **Custom keyboard service, no shortcut library** | The registry already centralizes commands; a ~100-line handler is simpler than fighting a library's scoping model, and the tricky parts (ignore typing in inputs, browser-reserved combos) must be custom anyway. |
| A10 | **Svelte stores are thin adapters/view-models**, not the state itself | Domain classes emit typed events; small store adapters translate them to Svelte reactivity (works with both Svelte 4 stores and Svelte 5 runes). |
| A11 | **Built-ins are plugins** | Blur is registered exactly like a hypothetical third-party effect; this forces the plugin API to be real rather than decorative. |
| A12 | **Native browser APIs for files** (`createImageBitmap`, `canvas.toBlob`, drag & drop, download anchor) | No `file-saver`, no image-loading lib — the platform APIs are the mature solution here. |

<details>
<summary><strong>Explicit answers to the 17 required architecture questions</strong> (click to expand — each is elaborated in the referenced section)</summary>

1. **Svelte/domain/Pixi separation?** Svelte = shell + reactive mirrors; domain = framework-free classes with typed events; Pixi = implements core's `Surface` interfaces. See §4.
2. **Document model?** `ImageDocument` (meta, layers, view, selection, history) inside a `DocumentRegistry`; see §5.
3. **Raster layers without locking the future?** `Layer` has a `kind` field and a `surfaceId` handle; rendering dispatches per `kind`; non-raster layers later add new kinds, not a rewrite. See §5.
4. **Hybrid undo?** Commands for metadata; region surface-snapshots for raster edits; budget + eviction. See §8.
5. **Low-latency brush?** Stroke-buffer `RenderTexture` + interpolated stamping; see §7.
6. **RenderTexture/compositing management?** `SurfaceStore` (IDs → textures, pooling, region copies) + per-doc scene graph; see §6.
7. **Mouse-anchored zoom?** Viewport transform with formula $\text{pan}' = m - (m - \text{pan}) \cdot z'/z$; see §6.
8. **GPU blur?** Pixi `BlurFilter` (separable, multi-pass) rendered off-screen into a new surface; see §7.
9. **GPU vs CPU readback?** Painting/compositing/zoom/effects stay GPU-side. Readbacks only for: flood fill analysis, magic wand, export, clipboard. See §7.
10. **Workers/OffscreenCanvas?** Deferred. Candidates appear in Slice 7 (flood fill/wand) and are only introduced after measuring. OffscreenCanvas is rejected for now (complexity ≫ benefit). See §7.
11. **Plugin architecture?** One `PluginContext` with `registerTool/registerEffect/registerAdjustment/registerImporter/registerExporter/registerCommand/addMenuItem`; see §9.
12. **Built-ins use the same path?** Yes — `src/plugins/builtin/*` registers through `PluginContext` like everyone else. See §9.
13. **npm vs native?** New: `pixi.js`, `pixi-filters`. Native: file I/O, DnD, shortcuts, context menu, UUID. Optional later: `iro.js`, `fflate`. See §10.
14. **Folder architecture?** `core/ render/ tools/ services/ state/ plugins/ components/`; see §11.
15. **Dependency rules?** Strict directional rules; see §12.
16. **Risks near size limits?** Device texture limits (8192 vs 16384), $4\cdot W\cdot H$ bytes per surface × (layers + history + stroke buffer), fill-rate on integrated GPUs; mitigated by the pixel budget, history budget, pooling. See §7.
17. **MVP vs deferred?** Slices 1–11 = MVP; explicit backlog after that. See §13.

</details>

---

# 3. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  SVELTE UI (shell only)                                        │
│  App.svelte → MenuBar · TabBar · Toolbar · StatusBar           │
│               Sidebar(History, Layers) · ColorBar · Dialogs    │
│               StartScreen · EditorCanvas(hosts <canvas>)       │
└──────────────┬────────────────────────────────────────────────┘
               │ reads (one-way) / dispatches intents
               ▼
┌───────────────────────────────────────────────────────────────┐
│  SERVICES (controllers)                                        │
│  CommandRegistry  MenuService  ShortcutService  FileService     │
│  DialogService    SettingsService(localStorage)  ToolHost       │
│  PluginRegistry                                               │
└──────────────┬────────────────────────────────────────────────┘
               │ mutates / queries
               ▼
┌───────────────────────────────────────────────────────────────┐
│  DOMAIN CORE (framework-free TypeScript)                       │
│  DocumentRegistry → ImageDocument                               │
│      ├── layers: Layer[] (kind + surfaceId refs only)          │
│      ├── view: Viewport { zoom, pan }                          │
│      ├── selection: SelectionModel (geometry + mask surfaceId) │
│      └── history: HistoryStack ← Commands                      │
│  Tools (controller classes) operate via RasterOps interface    │
└──────────────┬────────────────────────────────────────────────┘
               │ emits typed change events
               ▼
┌───────────────────────────────────────────────────────────────┐
│  RENDER LAYER (PixiJS v8, WebGL)                               │
│  EditorRenderer (single Application) → DocScene per document    │
│  SurfaceStore: SurfaceId → RenderTexture                        │
│  RasterOps impl: stamp / fill / blit / copyRegion / readRegion │
│  Viewport applier · checkerboard · export compositor           │
└───────────────────────────────────────────────────────────────┘
```

**Data flow of one user action** (e.g., dragging a slider in an effect dialog):
Svelte event → `CommandRegistry.run(id)` / service call → domain mutation + typed event → (a) Svelte adapter store notifies UI, (b) `EditorRenderer` reconciles scene graph. Never the reverse: components never mutate domain objects directly.

---

# 4. State and Responsibility Model

| State category | Where it lives | Why |
|---|---|---|
| **UI state** (active tool, dialogs open, menu open, panel visibility, colors) | Svelte stores (`state/ui.ts`), mirrored into domain only when a tool needs it | Cheap, purely presentational; Svelte is the right owner |
| **Document state** (open docs, layer metadata, doc meta, dirty flag) | Domain: `DocumentRegistry` + `ImageDocument`; Svelte sees an **immutable snapshot adapter store** (`state/documents.ts`) | Source of truth survives component unmounts; UI re-renders via adapter notifications |
| **Tool/interaction state** | Tool controller classes (`tools/*`) + `ToolHost` | Ephemeral, high-frequency (pointer moves) — must never trigger Svelte reactivity per event |
| **Selection state** | Domain: `SelectionModel` per document | Shared by all tools (mandated centralized system) |
| **History state** | Domain: `HistoryStack` per document; UI panel reads label list adapter | Undo/redo is domain logic, explicitly not a Svelte store |
| **Rendering state** (zoom, pan) | Domain `doc.view` (per-doc, restorable) + applied by renderer | Zoom must survive tab switches → belongs to document, not UI |
| **Rendering state** (Pixi objects, surfaces) | Render layer only (`SurfaceStore`, `DocScene`) | Pixi objects are never exposed to Svelte |

**Rule of thumb:** if a value must survive a tab switch or an undo, it lives in the domain. If it dies with a closed dialog, it lives in Svelte.

---

# 5. Document and Layer Model

Shape sketch (illustrative, not implementation code):

```ts
// core/document/ImageDocument.ts
class ImageDocument {
  id: DocId
  name: string
  width: number            // fixed per document (resize = explicit op)
  height: number
  layers: Layer[]          // index 0 = bottom
  activeLayerId: LayerId
  view: { zoom: number; panX: number; panY: number }
  selection: SelectionModel
  history: HistoryStack
  dirty: boolean
}

// core/layers/Layer.ts
interface Layer {
  id: LayerId
  kind: 'raster'              // extensible union: 'text' | 'shape' | ... later
  name: string
  visible: boolean
  opacity: number             // 0..1
  blendMode: string           // 'normal' initially; cheap to add more (Pixi string modes)
  surfaceId: SurfaceId        // opaque handle; pixels owned by render-layer SurfaceStore
}
```

Key properties of this design:

- **Pixels are not in the domain.** `surfaceId` is an opaque key; only `SurfaceStore` can resolve it to a `RenderTexture`. Future `TextLayer`/adjustment layers keep metadata here and register their own kind in the renderer — no interface surgery.
- **Opened images are one-layer documents from day one** — no throwaway "single image" special case in Slice 1 that would need refactoring in Slice 3.
- **`SelectionModel`** holds (a) optional path geometry (for marching-ants outline) and (b) a mask `SurfaceId` (full-doc-size `RenderTexture`, alpha = selection). Geometry-producing tools (rect/ellipse/lasso) write both; pixel tools (wand) produce the mask and a bounding-box outline.
- **Size limits** (enforced in `core/limits.ts`):
  - `MAX_DIMENSION = 16384` (further clamped at runtime by the device's WebGL `MAX_TEXTURE_SIZE`, which can be 8192)
  - `MAX_PIXELS = 2^26` (67.1 MP) — memory matters more than edge length; a $16384^2$ image would be ~1 GB per surface and is rejected even though the edge is legal
  - The New Image dialog displays the estimated bytes per layer: $\text{bytes} = 4 \cdot W \cdot H$.

---

# 6. Rendering Architecture

## 6.1 Scene graph

```
stage (screen space)
└── activeDocScene.root  ← position/scale from doc.view (the only transform that changes on pan/zoom)
    ├── checkerboardSprite   (TilingSprite, tileScale kept constant in screen space)
    ├── layerContainer      (one Sprite per layer, in z-order; texture = layer's RenderTexture,
    │                         alpha = opacity, visible = visible)
    ├── selectionOverlay     (ants outline; image space)
    └── toolOverlay          (live previews: stroke buffer, shape preview, floating selection)
```

- Inactive documents keep their `DocScene` (detached) and their surfaces alive → instant tab switching, no reload.
- Compositing layers is plain sprite batching → GPU. No CPU compositing anywhere.

## 6.2 Viewport (zoom/pan)

Only `root.position` and `root.scale` change. Mapping (screen px, logical):

$$\text{screen} = \text{pan} + \text{image} \cdot z \qquad\qquad \text{image} = \frac{\text{screen} - \text{pan}}{z}$$

Wheel zoom anchored at the mouse position $m$:

$$\text{pan}' = m - (m - \text{pan}) \cdot \frac{z'}{z}$$

- Zoom clamp: $z \in [0.01, 32]$ (1%–3200%).
- Wheel delta handling: multiplicative, `z' = z · exp(-deltaY · k)` with small `k` (~0.0015) so trackpads and notched mice both feel right; clamp to discrete steps is *not* required.
- Pan: middle-button drag + Space+drag; Space tracked globally but suppressed while focus is in an input.
- Pan/zoom never touches textures → inherently fast; performance risk is zero if the scene graph is flat (it is).

## 6.3 Surfaces and the `RasterOps` seam

The render layer exposes these primitives (the *only* way anything draws pixels):

| Operation | Implementation | Cost |
|---|---|---|
| `createSurface(w, h)` | `RenderTexture.create({width, height})` | GPU alloc |
| `surfaceFromBitmap(bmp)` | `Texture.from(imageBitmap)` | one upload |
| `fill(surface, rect, color, mask?)` | render a colored rect/graphics into RT (through selection mask) | fill-rate only |
| `copyRegion(src, rect) → surface` | render sprite with cropped `Texture` frame into a small RT | GPU→GPU copy |
| `blit(src, dst, pos, blend, alpha, mask?)` | `renderer.render({container, target: dst, clear:false})` | fill-rate |
| `stamp(sprite, intoSurface)` | render one stamp sprite into RT (brush) | trivial |
| `readRegion(surface, rect) → ImageData` | `renderer.extract` of the region (expensive — logged/justified) | GPU→CPU stall |

Core/tools/history call these via the interface; nothing else in the app creates Pixi objects.

## 6.4 PixiJS v8 idiom cheat sheet

DeepSeek Flash's training data leans heavily on v7. **These are v8 facts** (verified against v8 docs):

| Purpose | v8 idiom (NOT v7) |
|---|---|
| Init | `const app = new Application(); await app.init({...})` — constructor takes **no options**; init is **async** |
| Force WebGL | `app.init({ preference: 'webgl', ... })` |
| Canvas element | `app.canvas` (not `app.view`) |
| Render into a texture | `app.renderer.render({ container, target: renderTexture, clear: false })` |
| Create RT | `RenderTexture.create({ width, height })` |
| Texture from bitmap | `Texture.from(imageBitmap)` |
| Tiling sprite | `new TilingSprite({ texture, width, height })` (options object) |
| Graphics | fluent style: `.rect(x,y,w,h).fill(color)` — builds geometry, doesn't draw immediately |
| Blend modes | strings: `'normal'`, `'erase'` (= destination-out), `'multiply'`, … |
| Extract | `app.renderer.extract.canvas(container)` |
| Resize | `app.renderer.resize(w, h)`; pair with `resolution: devicePixelRatio, autoDensity: true` |

---

# 7. Performance Strategy

## 7.1 Brush latency (top priority)

**Chosen architecture — stroke buffer:**

```
pointer events ──► interpolation (spacing-based) ──► stamp sprites
                                                        │ renderer.render into
                                                        ▼
                              pooled stroke RenderTexture (per doc)
                                                        │ rendered on top of layer
                                                        ▼
                              live preview (same frame, ≤16 ms)
on pointer-up ──► snapshot layer region ──► blit stroke buffer into layer
              (alpha = brush opacity, or 'erase' blend for eraser) ──► StrokeCommand
```

- **Stamps**: one pre-baked white radial-falloff texture (~256×256) per hardness bucket (cache ~11 variants); each stamp = one sprite scaled to brush size, tinted with the color, alpha modulated by pressure. Sprites are pooled/reused — zero allocation per event.
- **Interpolation**: segment spacing $s = \max(1\ \text{px}, \text{spacing}\% \cdot \text{diameter})$; stamps placed along each pointer segment; smooth optional via simple exponential point smoothing.
- **Why a separate stroke buffer instead of stamping directly into the layer**: (a) Paint.NET-like stroke opacity — overlapping stamps inside one stroke must *not* build up; compositing the whole buffer once at `alpha = opacity` gives exactly that; (b) cancel/discard is free; (c) undo = region snapshot, no full layer copy.
- **Latency budget**: pointer event → stamps into RT (cheap, no uploads) → next rAF composite. Worst case one frame (~16 ms). No readbacks, no full-texture uploads, no per-event `ImageData`.
- **Memory note**: stroke buffer is doc-sized and **pooled** (allocated once per document, reused per stroke) — otherwise a $2^{26}$-px document would allocate 256 MB per stroke.

**Rejected alternatives** (and why):

- *Pixi `Graphics` per pointer event*: rebuilds/triangulates geometry every event; wrong tool for raster paint.
- *CPU painting into `ImageData`*: full-texture upload per frame; the single worst possible architecture here.
- *Full-layer snapshot per stroke for undo*: $4 \cdot W \cdot H$ bytes per stroke → hundreds of MB after 10 strokes. Region snapshots instead.
- *OffscreenCanvas + Workers for painting*: unnecessary — the GPU path is already fast; keep the main-thread pipeline simple.

## 7.2 Pan & zoom

Pure container transform (§6.2). No texture work. Continuous ticker is acceptable in the MVP; switch to render-on-invalidate (a `dirty` flag checked by the ticker) in the polish slice.

## 7.3 GPU effects

- Effects render off-screen: `sprite(layerSurface) + filter` → new surface → swap layer's `surfaceId`. One GPU pass pair, zero readbacks; the before-surface doubles as the undo snapshot.
- **Blur**: Pixi `BlurFilter` (separable Gaussian, multi-pass). For large layers, cap the internal filter `resolution` to ≤1 and consider 0.5 on low-end GPUs (blur quality is resolution-tolerant).
- **Brightness/Contrast/Saturation**: `ColorMatrixFilter` helpers — a single matrix multiply, effectively free.
- **Sharpen**: `ConvolutionFilter` (3×3 kernel) from `pixi-filters` v6 (the PixiJS-v8-compatible major).

## 7.4 CPU readback policy (allowed, rare, justified)

| Operation | CPU? | Reason |
|---|---|---|
| Painting, compositing, zoom/pan, adjustments, blur, shapes | **No** | GPU-native |
| Export PNG | Yes, once | `extract` → `toBlob` |
| Flood fill / magic wand analysis | Yes (Slice 7) | Connectivity analysis is inherently sequential CPU; measure first, move to a Worker only if jank is observed on ≥ 20 MP docs |
| Copy/cut/paste, eyedropper | Yes, tiny region | negligible |

## 7.5 Memory model & budgets

Per surface: $\text{bytes} = 4 \cdot W \cdot H$ (RGBA8). Steady state per document ≈

$$\underbrace{L \cdot 4 W H}_{\text{layers}} + \underbrace{4 W H}_{\text{pooled stroke buffer}} + \underbrace{\le 256\ \text{MB}}_{\text{history snapshots (budget)}}$$

- Defaults: `MAX_PIXELS = 2^26`, history budget **256 MB / 100 entries per doc**, oldest-first eviction (undo tail trimming).
- Dangerous operations checklist (for the implementer): full-canvas `extract` in a loop, `ImageData` painting, per-event texture creation, full-texture re-upload after small edits, synchronous flood fill of huge regions, unbounded snapshot retention.
- Device variance: read `MAX_TEXTURE_SIZE` at startup and clamp; surface the actual device limit in the New Image dialog.

## 7.6 Workers / OffscreenCanvas

Deferred by design. When Slice 7 shows jank (measure on a 40 MP doc), flood fill/wand move to a Web Worker with `postMessage` + transferable `Uint8ClampedArray`. OffscreenCanvas (moving the whole renderer into a worker) is rejected for the MVP — it complicates everything for a benefit this app doesn't need yet.

---

# 8. Undo/Redo Strategy

**Hybrid, per document.** `HistoryStack` stores `Command` objects:

```ts
interface Command {
  label: string            // "Brush Stroke", "Add Layer", "Gaussian Blur"…
  memoryBytes: number      // for budget accounting (0 for metadata commands)
  apply(doc): void         // redo
  revert(doc): void        // undo
  dispose(): void          // free snapshot surfaces when evicted/dropped
}
```

| Operation class | History mechanism | Memory cost |
|---|---|---|
| Add/Delete/Reorder layer, opacity, visibility, selection change, doc rename | Pure metadata command (references + old/new values) | ~0 |
| Brush stroke, eraser stroke, delete/fill, move-selection commit | `RegionSnapshotCommand`: `copyRegion` before → `copyRegion` after (only the stroke's dirty bbox) → restore on undo/redo via `blit` | $2 \cdot 4 \cdot w \cdot h$ of the *dirty rect* |
| Whole-layer effects (blur, sharpen, adjustments, resize, rotate) | `SurfaceSwapCommand`: before-surface + after-surface (the effect's output), swap on undo/redo | $2 \cdot 4 \cdot W \cdot H$ — accepted, bounded by budget |
| Paste / add layer from bitmap | Command holds the source `SurfaceId` | $4 \cdot W \cdot H$ while in stack |

- `HistoryStack` tracks accumulated `memoryBytes`; when the budget (256 MB) or entry cap (100) is exceeded, oldest commands are trimmed (their `dispose()` frees surfaces).
- Redo stack is cleared on new push (standard).
- History panel = read-only adapter over stack labels + current index; clicking an older entry issues repeated undo/redo (Paint.NET behavior).
- **Explicitly not** a Svelte store: Svelte only observes.

---

# 9. Plugin Architecture

One interface, used by built-ins and (later) third parties:

```ts
interface EditorPlugin {
  id: string
  name: string
  version: string
  setup(ctx: PluginContext): void
}

interface PluginContext {
  registerCommand(def: CommandDef): void          // id, label, shortcut?, run, isEnabled
  addMenuItem(item: { path: string; commandId: string }): void  // e.g. "Effects/Blurs/Blur"
  registerTool(def: ToolDef): void
  registerEffect(def: EffectDef): void           // category 'adjustment' | 'effect' + submenu
  registerImporter(def: ImporterDef): void
  registerExporter(def: ExporterDef): void
  surfaces: RasterOps                            // the same primitives the core uses
  editor: EditorFacade                           // narrow read API: activeDoc, docs, selection…
}
```

- **Effects** declare a small settings schema (sliders/selects only for MVP) → one generic `EffectSettingsDialog.svelte` renders it with live preview, so *no effect ships its own UI component* unless it wants to.
- **Plugin metadata / registration / UI integration / execution** are separate: metadata in the def object; registration through `PluginContext`; menu integration through `addMenuItem`; execution via `registerCommand`'s `run`.
- Plugins may be pure TS modules, may construct Pixi filters, or may provide optional Svelte components — never required to be components.
- `src/plugins/builtin/*.ts` registers: Adjustments (Brightness, Contrast, Saturation), Effects (Gaussian Blur, Sharpen), PNG exporter, PNG/decoder importer. **The MVP "plugin system" is exactly this much** — no loading, no sandboxing, no versioning. Those are backlog.

---

# 10. Recommended npm Dependencies

| Package | Added in | Solves | Why this one | Integration |
|---|---|---|---|---|
| `pixi.js` (v8.x) | Slice 1 | The entire rendering pipeline | The requirement; mature, WebGPU-ready abstraction | Owns the `<canvas>`; all Pixi objects confined to `src/lib/render/` |
| `pixi-filters` (v6.x — **must be v6 for Pixi v8**) | Slice 6 | `ConvolutionFilter` for Sharpen | Official PixiJS org package; peer-dep verified for v8 | Effect plugin constructs the filter like any other |
| *(already installed)* Svelte, Tailwind, Fluent-UI-Emoji icon package | — | UI shell, styling, colorful toolbar icons | Given. If the installed emoji package is one of the known candidates (`@fluentui-emoji/svelte`, `fluentui-emoji-svelte`, …) use its documented per-icon imports; do not add a second icon package | Toolbar/buttons only |
| `fflate` | Backlog | Future project format packaging | Fastest, tree-shakable ZIP | Importer/exporter plugins |
| `iro.js` | Optional (Slice 11) | HSV wheel color picker | Mature, framework-agnostic, tiny | Color bar popover — only if the native `<input type="color">` feels insufficient |

**Deliberately native (no dependency):**

| Need | Native solution |
|---|---|
| File open | `<input type="file">` + `createImageBitmap` |
| Drag & drop | HTML5 DnD events |
| PNG save | `canvas.toBlob` + download anchor (no `file-saver`) |
| Keyboard shortcuts | custom `ShortcutService` (A9) |
| Context menus | custom (Slice 11) |
| UUIDs | `crypto.randomUUID()` |
| State management | Svelte stores/adapters (no Redux, no zustand) |
| Image decode | browser codecs via `createImageBitmap` |

---

# 11. Proposed Folder Structure

```
src/
  main.ts / +page.svelte (entry — depends on existing scaffold)
  App.svelte
  app.css (Tailwind + theme tokens: dark palette via CSS variables)
  lib/
    core/                      # framework-free domain — NO svelte, NO pixi imports
      id.ts                     # crypto.randomUUID wrapper
      events.ts                 # tiny typed emitter
      geometry.ts               # Point, Rect, clamp helpers
      limits.ts                 # MAX_DIMENSION, MAX_PIXELS, budgets
      document/
        ImageDocument.ts
        DocumentRegistry.ts
      layers/
        Layer.ts                # Layer interface + raster layer factory
      selection/
        SelectionModel.ts
      history/
        HistoryStack.ts
        Command.ts
        commands/               # MetadataCommand, RegionSnapshotCommand, SurfaceSwapCommand
    render/                     # PixiJS v8 — the ONLY place pixi.js is imported
      EditorRenderer.ts         # owns Application, active scene attach, ticker
      DocScene.ts               # per-doc container: checker + layer sprites + overlays
      SurfaceStore.ts           # SurfaceId ↔ RenderTexture, pooling, RasterOps impl
      Viewport.ts               # zoom/pan math, zoomAt(mouse)
      checkerboard.ts
      export.ts                 # composite (no checker) → extract → PNG blob
    tools/
      Tool.ts                   # ToolDef/Tool interface, ToolContext
      ToolHost.ts               # pointer routing: screen→image coords, capture
      registry.ts
      paint/BrushTool.ts, EraserTool.ts (pencil = brush preset)
      paint/StrokeEngine.ts     # shared stroke-buffer logic
      selection/RectTool.ts, EllipseTool.ts, LassoTool.ts, WandTool.ts
      paint/BucketTool.ts, EyedropperTool.ts
      transform/MoveTool.ts, CropTool.ts
      shape/ShapeTool.ts
      text/TextTool.ts
      gradient/GradientTool.ts
    services/
      commandRegistry.ts        # id → {label, shortcut, run, isEnabled}
      menuService.ts            # declarative tree; grows via addMenuItem
      shortcutService.ts
      fileService.ts            # open/decode/validate, new, export
      dialogService.ts
      settingsService.ts        # localStorage (Slice 11)
      clipboardService.ts
    plugins/
      types.ts                  # PluginContext etc.
      PluginRegistry.ts
      builtin/
        adjustments.ts          # brightness/contrast/saturation via ColorMatrixFilter
        effects.ts              # blur (BlurFilter), sharpen (ConvolutionFilter)
        io.ts                   # PNG importer/exporter
    state/                      # Svelte adapters (view-models) — may import core/services
      documents.ts              # { docs: DocMeta[]; activeId } snapshot store
      ui.ts                     # activeTool, dialogs, panels, colors
    components/
      shell/  MenuBar · TabBar · Toolbar · StatusBar · Sidebar · ColorBar
      canvas/ EditorCanvas.svelte
      start/  StartScreen.svelte
      dialogs/ DialogHost · NewImageDialog · EffectSettingsDialog · ResizeDialog …
      panels/ HistoryPanel · LayersPanel
      common/ Slider · ContextMenu · Icon helpers
```

---

# 12. Dependency Rules

Allowed import direction (top may import down, **never up or sideways**):

```
components → state → services → core
components → services
render → core
tools → core
plugins → plugins/types, core   (plugins may import pixi.js ONLY to construct filters)
state → core
```

Explicitly forbidden:

- `core/` importing `svelte`, `pixi.js`, or anything from `render/`, `services/`, `state/` — **core is the bottom of the stack**
- `components/` importing `pixi.js` (the single exception: `EditorCanvas.svelte` receives a canvas element and hands it to `EditorRenderer`; it imports no Pixi symbols)
- `render/` importing anything from Svelte
- `tools/` importing Svelte components (tools draw via `RasterOps`/overlays only)
- `plugins/` importing app internals except via `PluginContext`
- Svelte components mutating domain objects directly — mutations go through services/commands, always

Enforcement for now: review discipline + a one-line comment header rule per file stating its layer. (An ESLint import-restriction config is an easy polish-slice addition.)

---

# 13. MVP Roadmap

Eleven slices, each independently runnable. Later slices **may be re-scoped after feedback** — this order is a proposal, not a contract.

### Slice 1 — Application Shell & Document Viewer
*(full detail in §14)*
- **1. Slice Name:** Application Shell & Document Viewer
- **2. Goal:** A working dark-mode image viewer inside the complete Paint.NET-style shell.
- **3. User-Visible Result:** Drop/open images, multi-tab documents, smooth wheel-zoom anchored at the pointer, pan, new-image dialog, PNG export, status bar.
- **4. Scope:** Shell layout, menu bar (File/View functional, others disabled placeholders), start screen (drop/click/new), document tabs, Pixi rendering with checkerboard, zoom/pan, export, toolbar with colorful icons (inert), status bar, context-menu suppression inside app area.
- **5. Explicitly Out of Scope:** Any painting/tools behavior, layers panel, history/undo, effects, plugins folder, settings persistence, light theme, pixel grid, context menu content.
- **6. Architecture Decisions:** A1–A8 of §2; one-layer documents from day one.
- **7. Files & Modules:** See §14.
- **8. npm Dependencies:** `pixi.js` only.
- **9. Implementation Steps:** See §14.
- **10. Acceptance Criteria / 11. Manual Test Checklist / 12. Risks / 13. Feedback Points:** See §14.

### Slice 2 — Painting Core
- **1. Slice Name:** Painting Core (Brush/Pencil/Eraser)
- **2. Goal:** Real drawing with low latency and stroke-level undo.
- **3. User-Visible Result:** Paint and erase on the image with adjustable size/hardness/opacity, pressure support, foreground/background colors, `Ctrl+Z`/`Ctrl+Y` undo/redo per stroke.
- **4. Scope:** Tool infrastructure (`Tool`, `ToolHost`, pointer routing, screen↔image mapping); `StrokeEngine` (stroke buffer, stamp interpolation, hardness cache, pressure); brush circle cursor preview; `[`/`]` size keys; fg/bg color swatches with native color input + swap (X) + reset; `RegionSnapshotCommand`-based stroke undo; `dirty` flag + tab indicator.
- **5. Out of Scope:** Layer panel/commands, selection, textured brushes, brush editor, smooth-stroke stabilization beyond simple point smoothing.
- **6. Architecture Decisions:** §7.1 stroke buffer; pooled per-doc stroke RT; stamps into RT on pointer event, composite via ticker (≤1 frame latency).
- **7. Files:** `tools/Tool.ts`, `ToolHost.ts`, `paint/BrushTool.ts`, `paint/EraserTool.ts`, `paint/StrokeEngine.ts`, `render/SurfaceStore.ts` (+stamp/copyRegion ops), `core/history/commands/RegionSnapshotCommand.ts`, `components/shell/ColorBar.svelte` (functional), `state/ui.ts` (colors/brush settings).
- **8. npm Dependencies:** none (native).
- **9. Steps:** (1) ToolHost + coordinate mapping with a debug click-marker; (2) `RasterOps.stamp/copyRegion`; (3) StrokeEngine hard-coded round brush; (4) commit + RegionSnapshotCommand + wire Ctrl+Z/Y; (5) eraser via `'erase'` blend; (6) hardness cache + settings popover; (7) brush cursor overlay; (8) pressure; (9) pencil preset.
- **10. Acceptance:** 60 fps painting on 1920×1080 at 100%/400% zoom; stroke opacity matches Paint.NET (no internal build-up); undo restores pixels exactly.
- **11. Manual Tests:** draw slow/fast strokes; toggle size `[`/`]`; erase; undo/redo 5×; draw while zoomed — cursor size scales with zoom; pen pressure changes size (if device available).
- **12. Risks:** `'erase'` blend-mode semantics inside RTs; premultiplied-alpha edge tinting at soft brush edges; stroke buffer clear cost per stroke on huge docs.
- **13. Feedback Points:** latency feel at 4K; whether opacity semantics feel right; whether stabilization is needed; memory of pooled buffer on big docs.

### Slice 3 — Layers & History Panel
- **1. Slice Name:** Layers & History
- **2. Goal:** Multi-layer documents + Command-Pattern undo + history/layer panels.
- **3. User-Visible Result:** Add/delete/reorder/hide/re-opacity layers, active-layer selection, unified undo/redo for layer ops, history list with meaningful names.
- **4. Scope:** Layer panel UI (thumbnails via small downsampled surfaces), metadata commands (Add/Delete/Reorder/Opacity/Visibility), `HistoryStack` + budget/eviction, history panel (labels, click-to-travel), refactoring stroke undo into the unified stack, `Layers` menu entries.
- **5. Out of Scope:** Blend modes (UI exists but fixed to Normal), masks, groups, non-raster layer kinds.
- **6. Architecture Decisions:** Commands are the only path that mutates layer metadata; budget eviction trims undo tail (§8).
- **7. Files:** `components/panels/LayersPanel.svelte`, `HistoryPanel.svelte`, `core/layers/Layer.ts` (finalize), `core/history/commands/*` metadata commands, `state/documents.ts` (layer snapshots).
- **8. npm Dependencies:** none.
- **9. Steps:** (1) Layer model finalize + multi-sprite compositing (already works from Slice 1's DocScene); (2) layer commands; (3) panel UI list; (4) opacity slider; (5) thumbnails; (6) history panel; (7) budget eviction; (8) menu entries + shortcuts.
- **10. Acceptance:** every panel action reversible via Ctrl+Z; history names correct ("Add Layer", "Brush Stroke", …); 30+ heavy ops trigger eviction without crash.
- **11. Manual Tests:** add 3 layers, paint on each, reorder, hide, undo everything back to single layer; rename layer via double-click.
- **12. Risks:** thumbnail refresh cost (regenerate on commit only, not per stroke); z-order bugs on reorder.
- **13. Feedback Points:** panel density/layout; whether eviction limit is felt; thumbnail update feel during strokes.

### Slice 4 — Selection Core
- **1. Slice Name:** Rectangle/Ellipse/Lasso Selection & Clipping
- **2. Goal:** Centralized selection that clips painting and powers delete/fill.
- **3. User-Visible Result:** Draw selections (rect/ellipse/lasso) with dashed outline, paint/erase/fill only inside selection, `Delete` clears, `Ctrl+A`/`Ctrl+D`/`Ctrl+I` work.
- **4. Scope:** `SelectionModel` (geometry + mask surface), three selection tools, ants outline (redrawn dashed Graphics), mask-enforced commit path for strokes/fill/delete, Select All/Deselect/Invert, selection-aware effects groundwork (mask param in `RasterOps`).
- **5. Out of Scope:** Magic wand & color select (Slice 7), Move tool (Slice 5), floating selections, feathering.
- **6. Architecture Decisions:** one mask RT per doc (pooled); geometry-driven ants; all consumers go through mask, never per-tool selection logic (mandated).
- **7. Files:** `core/selection/SelectionModel.ts`, `tools/selection/RectTool.ts`, `EllipseTool.ts`, `LassoTool.ts`, `render` mask ops, `SelectionOverlay` in DocScene.
- **8. npm Dependencies:** none.
- **9. Steps:** (1) mask surface + clear/draw ops; (2) rect tool + ants; (3) commit-path masking for strokes (blit stroke buffer through mask); (4) ellipse; (5) lasso (polygon → mask fill); (6) select menu commands; (7) delete/fill.
- **10. Acceptance:** painting with active selection never leaks outside; invert works; deselect drops ants.
- **11. Manual Tests:** rect select → brush partially outside → only inside painted; ellipse + delete; lasso freehand; Ctrl+A then paint = unclipped.
- **12. Risks:** ants redraw cost (cap to outline redraw per frame); mask-precision at fractional zoom coordinates (snap to integer pixels on commit).
- **13. Feedback Points:** ants visual quality; lasso ergonomics (point count); whether Move tool should jump ahead of Slice 5 order.

### Slice 5 — Move & Clipboard
- **1. Slice Name:** Move Tool & Copy/Paste
- **2. Goal:** Move selected pixels; internal + system clipboard.
- **3. User-Visible Result:** Move selection content by dragging (floating overlay commits on click-away), Copy/Cut/Paste (`Ctrl+C/X/V`), paste-from-system-clipboard (paste event), "Paste as new layer".
- **4. Scope:** `MoveTool` (lift region → overlay sprite → commit with RegionSnapshotCommand), `clipboardService` (internal surface), paste event handler for OS images.
- **5. Out of Scope:** Transform handles (resize/rotate of selection), paste positioning UX beyond centering.
- **6. Architecture Decisions:** Floating content is a preview overlay; single commit command keeps history clean.
- **7. Files:** `tools/transform/MoveTool.ts`, `services/clipboardService.ts`, paste wiring in `EditorCanvas.svelte`.
- **8. npm Dependencies:** none.
- **9. Steps:** (1) lift-through-mask; (2) overlay drag; (3) commit; (4) copy/cut; (5) paste as layer; (6) OS paste event.
- **10. Acceptance:** move round-trips through undo as one step; cut leaves transparency; paste creates new layer entry in history.
- **11. Manual Tests:** select → move → deselect → undo → original position; copy from doc A paste into doc B.
- **12. Risks:** commit-on-tool-switch edge cases; mask lift correctness on partial-transparent content.
- **13. Feedback Points:** commit trigger feel vs Paint.NET; whether transform handles are wanted next (they'd pull Slice 8 forward).

### Slice 6 — Adjustments, Effects & Plugin Registry
- **1. Slice Name:** Plugin Registry + First Adjustments/Effects
- **2. Goal:** Effects/adjustments as plugins, with live-preview dialogs and GPU execution.
- **3. User-Visible Result:** `Adjustments` menu: Brightness/Contrast/Saturation with live preview sliders; `Effects` menu: Gaussian Blur, Sharpen; all undoable with correct names.
- **4. Scope:** `PluginContext`/`PluginRegistry` (§9), menu assembly from registry, generic settings-schema dialog + live preview, off-screen apply (§7.3), `SurfaceSwapCommand`, scope = active layer (or selection bbox when present).
- **5. Out of Scope:** More effects, effect stacks, non-destructive application, presets, worker-based effects.
- **6. Architecture Decisions:** preview = filter temporarily attached to the layer sprite in DocScene; apply = off-screen render into new surface; `pixi-filters` **v6**.
- **7. Files:** `plugins/*`, `plugins/builtin/adjustments.ts`, `effects.ts`, `components/dialogs/EffectSettingsDialog.svelte`, `core/history/commands/SurfaceSwapCommand.ts`.
- **8. npm Dependencies:** `pixi-filters@6`.
- **9. Steps:** (1) registry + command registration powering menus; (2) schema dialog; (3) ColorMatrix adjustments; (4) blur; (5) sharpen; (6) swap command + history labels.
- **10. Acceptance:** preview reacts ≤1 frame; apply+undo restores bit-exact layer; menus list plugins dynamically.
- **11. Manual Tests:** brightness -50 → undo; blur radius slider live; sharpen on photo; effects disabled when no doc open.
- **12. Risks:** filter preview fidelity at zoom≠100% (documented: preview is screen-res, apply is full-res); v8 filter `resolution` defaults.
- **13. Feedback Points:** schema-dialog sufficiency vs per-effect custom UI; whether effect scope should be selection-only.

### Slice 7 — Pixel Tools: Paint Bucket, Magic Wand, Eyedropper
- **1. Slice Name:** Flood Tools
- **2. Goal:** Tolerance-based fill and selection; color picking.
- **3. User-Visible Result:** Bucket fills contiguous color (tolerance, contiguous on/off), Magic Wand selects similar colors (non-contiguous mode = color select), eyedropper sets fg color.
- **4. Scope:** CPU flood fill via bounded `readRegion` → scanline fill → region upload; tolerance; wand → mask surface; eyedropper (1-px read); tool options bar (slim strip above canvas: tolerance slider, contiguous checkbox).
- **5. Out of Scope:** Workers (measure first), gradient fill, pattern fill.
- **6. Architecture Decisions:** Readbacks are region-bounded and once-per-click; if a 40 MP fill janks >100 ms, promote Worker task here (§7.6).
- **7. Files:** `tools/paint/BucketTool.ts`, `tools/selection/WandTool.ts`, `tools/paint/EyedropperTool.ts`, `flood.ts` (shared scanline logic), `components/shell/ToolOptions.svelte`.
- **8. npm Dependencies:** none.
- **9. Steps:** (1) readRegion; (2) scanline flood; (3) bucket commit + undo; (4) wand→mask; (5) tolerance UI; (6) eyedropper.
- **10. Acceptance:** fills bounded correctly at edges; tolerance 0 exact; wand result clips painting like Slice 4 selections.
- **11. Manual Tests:** fill flat region; fill with tolerance on photo gradient; wand sky; pick color; undo all.
- **12. Risks:** premultiplied alpha comparison errors in readback (compare with tolerance on RGBA); jank on huge regions (→ Worker).
- **13. Feedback Points:** measure fill time on largest test doc — Worker go/no-go; options bar placement.

### Slice 8 — Image Transforms
- **1. Slice Name:** Crop, Flip, Rotate, Resize
- **2. Goal:** Classic `Image` menu operations.
- **3. User-Visible Result:** Crop to selection, flip H/V, rotate 90/180, Canvas resize (anchor dialog), Image resize (bilinear, dimension-locked) — all undoable.
- **4. Scope:** New surface creation with transformed content (GPU blits/flips; resize via offscreen canvas draw for quality), `SurfaceSwapCommand` reuse, dialogs.
- **5. Out of Scope:** Free rotate/arbitrary angle, content-aware anything, multi-layer-independent transforms.
- **6. Architecture Decisions:** Document-level transforms touch *all layers* (Paint.NET semantics for resize/canvas); each layer swapped under one command.
- **7. Files:** `services/imageOpsService.ts`, `components/dialogs/ResizeDialog.svelte`, `CanvasResizeDialog.svelte`.
- **8. npm Dependencies:** none.
- **9. Steps:** (1) crop; (2) flips; (3) rotations; (4) canvas resize; (5) image resize dialog; (6) history + limits validation on resize targets.
- **10. Acceptance:** crop+undo bit-exact; resize enforces `MAX_PIXELS`; rotate keeps history intact.
- **11. Manual Tests:** crop to selection → undo; resize 1920×1080 → 800×600 → check status bar; rotate 180 twice.
- **12. Risks:** simultaneous all-layer swaps spiking memory (budget check first); resize quality (use canvas `imageSmoothingQuality='high'`).
- **13. Feedback Points:** dialog UX; whether arbitrary rotate is wanted soon (would need transform overlay).

### Slice 9 — Shapes
- **1. Slice Name:** Shape Tools
- **2. Goal:** Rect/ellipse/line/arrow drawing with live preview.
- **3. User-Visible Result:** Drag to draw outlined/filled shapes onto the active layer; Shift constrains; options: fill color, stroke color/width; committed as one history step.
- **4. Scope:** Shape preview via tool overlay (not stamping during drag), commit via `RasterOps` (fill + stroke paths through selection mask), arrowheads on line tool.
- **5. Out of Scope:** Editable shape layers (rasterized on commit by design), shape library, rounded rect.
- **7. Files:** `tools/shape/ShapeTool.ts`, options extensions in `ToolOptions.svelte`.
- **8. npm Dependencies:** none.
- **9. Steps:** (1) drag-preview rect; (2) commit fill; (3) stroke; (4) ellipse; (5) line; (6) arrowheads; (7) shift-constraint.
- **10. Acceptance:** preview matches commit; undo removes whole shape; selection clips shapes.
- **11. Manual Tests:** draw each shape; shift-drag square/circle; draw with active selection.
- **12. Risks:** Graphics triangulation for complex arrowheads (keep simple heads).
- **13. Feedback Points:** default stroke widths; whether pressure/width variety is wanted.

### Slice 10 — Text & Gradient
- **1. Slice Name:** Text Tool & Gradient Tool
- **2. Goal:** Rasterized text; fg→bg gradient fill.
- **3. User-Visible Result:** Click, type with font family/size/bold/italic in an options strip, commit rasterizes to active layer; gradient drag previews and fills selection (or whole layer).
- **4. Scope:** Text: overlay text input, offscreen 2D canvas rasterize → region upload; fonts = system fonts list. Gradient: linear/radial options, CPU canvas gradient into selection bbox (GPU variant backlog).
- **5. Out of Scope:** Editable text layers (architecture keeps `kind` open), curved text, multi-stop gradient editor (fg→bg only).
- **8. npm Dependencies:** none.
- **9. Steps:** (1) text input overlay; (2) options strip; (3) rasterize+commit; (4) gradient preview; (5) gradient commit through mask.
- **10. Acceptance:** text commit single undo step; gradient respects selection; rasterization crisp at 100% zoom.
- **12. Risks:** font metrics/DPR crispness in offscreen rasterization (render at 100% image resolution, not screen).
- **13. Feedback Points:** editing UX (commit on Esc vs click-away); gradient stop count demand.

### Slice 11 — Polish & Extensibility Pass
- **1. Slice Name:** Context Menus, Settings, Blend Modes, Grid
- **2. Goal:** The "feels finished" slice.
- **3. User-Visible Result:** Canvas/layer context menus, persisted settings (theme choice incl. light, last new-image values, brush defaults, panel collapse), pixel grid at high zoom, checkerboard toggle, layer blend-mode dropdown (Pixi string modes), `beforeunload` dirty guard, render-on-demand.
- **4. Scope:** `ContextMenu.svelte` framework reusing `MenuService` definitions; `settingsService` (localStorage, namespaced key, JSON, ~10 fields max); dirty guard; ticker dirty-flag.
- **5. Out of Scope:** Panel docking/resize, workspace layouts, third-party plugin loading.
- **8. npm Dependencies:** optionally `iro.js`.
- **10. Acceptance:** reload restores prefs; context menu items = same commands as menus; blend mode changes composite live.
- **13. Feedback Points:** everything — this slice exists to absorb accumulated feedback.

### Backlog (explicitly deferred, in rough priority order)

1. Custom project format (ZIP via `fflate`: JSON manifest + PNG per layer)
2. Clone Stamp (needs offset-sampling infra)
3. Free rotate/skew transform overlay
4. WebGPU experiment (swap `preference`, run test matrix — the `SurfaceId`/`RasterOps` seam exists for exactly this)
5. Worker-backed flood/wand; WebP/JPEG export options
6. Third-party plugin loading & sandboxing; custom shapes library
7. Text layers / shape layers / adjustment layers (non-destructive) — enabled by the `kind` field
8. Pressure-controlled textured brush tips

---

# 14. Detailed Slice 1

## 1. Slice Name
**Application Shell & Document Viewer** (with tabs, zoom/pan, New Image dialog, PNG export)

## 2. Goal
After this slice, the user can open/create images in a complete, dark-mode, Paint.NET-style desktop shell; view them with smooth mouse-anchored zoom and pan across multiple tabs; and export as PNG. All later slices plug into this skeleton without rework.

## 3. User-Visible Result
The user can: launch into a start screen; drag-drop or click-open PNGs (and other browser-decodable rasters); create new canvases via a New Image dialog with presets and validation; switch between open documents via compact tabs (each remembering its own zoom/pan); zoom toward the mouse cursor with the wheel; pan with middle-drag or Space+drag; see zoom %, cursor position, and image size in a status bar; export the active document as PNG; use File/View menus and their shortcuts.

## 4. Scope
- Full layout: menu bar + tab strip (top), vertical colorful toolbar (left), color bar placeholder (bottom-left), canvas (center), sidebar with empty History/Layers placeholder cards (right), status bar (bottom).
- Start screen (large drop area + "Open…" + "New…" buttons) when zero documents are open.
- New Image dialog: width/height inputs, 5 presets (1920×1080, 1280×800, 1080×1080, 1024×1024, 800×600), background = Transparent / White / Custom color, estimated-bytes display, validation against limits.
- Open: file picker (accept `image/*`), drag-drop onto start screen **and** onto the editor area; multi-file drop opens multiple tabs.
- Document tabs: name, close button, active highlight, middle-click close, dirty asterisk (reserved field, unused yet).
- Pixi rendering: single `Application`, per-doc `DocScene`, checkerboard under image, correct handling of window resize (ResizeObserver).
- Viewport: wheel zoom anchored at pointer (exp formula, clamp 1%–3200%), middle-drag + Space+drag pan, `Ctrl`+`+`/`-` zoom, `Ctrl+1` actual size, `Ctrl+0` fit-to-window.
- Export: composite active doc without checkerboard at 100% → `extract` → `toBlob('image/png')` → download anchor.
- Menus: functional **File** (New `Ctrl+Alt+N`, Open `Ctrl+O`, Save As PNG `Ctrl+S`, Close Tab `Ctrl+F4`) and **View** (zoom commands); **Edit/Image/Layers/Adjustments/Effects** render as disabled placeholder entries (structure only).
- Toolbar: colorful Fluent-UI-Emoji icons for the planned tool set, clickable (sets `activeTool` store; visual highlight only — no behavior yet).
- Suppress the browser context menu inside the app root element only.
- Dark mode by default via Tailwind + CSS-variable palette.

## 5. Explicitly Out of Scope
- Any painting/erasing/selection/move behavior; tool functionality beyond visual active-state
- Layer panel, history panel, undo/redo of any kind
- Effects, adjustments, plugin folder (do **not** create `plugins/` yet)
- Settings persistence (localStorage), light theme, pixel grid, zoom smoothing animation
- Project format, image resizing/cropping, context menu *content*
- Web Workers, OffscreenCanvas, WebGPU, render-on-demand optimization
- Unsaved-changes prompts on close (`beforeunload`)

## 6. Architecture Decisions (this slice only)
- Single Pixi `Application` created once inside `EditorCanvas.svelte`, WebGL forced, `resolution: devicePixelRatio, autoDensity: true`.
- `ImageDocument` already contains a `layers` array with exactly one raster layer per document — opened images and new canvases share one code path.
- Per-document view state on the domain object; `DocScene` applies it; tab switch re-attaches scene and re-applies that doc's view.
- `DocumentRegistry` (domain) emits events; `state/documents.ts` exposes a Svelte-compatible snapshot store. Components only read that store.
- Menus and shortcuts are driven by `CommandRegistry` entries (`label`, `shortcut`, `run`, `isEnabled`) — built once here, extended forever.
- Continuous ticker rendering (simplest correct choice); pointer handlers do only math + view mutation (no Pixi work besides transform).
- Files decode via `createImageBitmap`; dimension + pixel-budget validation before document creation; oversize files rejected with a clear message.
- Browser-reserved combos are avoided by design (`Ctrl+Alt+N` instead of `Ctrl+N`, `Ctrl+F4` instead of `Ctrl+W`).

## 7. Files and Modules

**Create:**

| File | Responsibility |
|---|---|
| `src/lib/core/id.ts` | `newId()` via `crypto.randomUUID()` |
| `src/lib/core/events.ts` | Tiny typed emitter (`on/off/emit`) for domain events |
| `src/lib/core/geometry.ts` | `Point`, `Rect` types, `clamp`, rect helpers |
| `src/lib/core/limits.ts` | `MAX_DIMENSION=16384`, `MAX_PIXELS=2^26`, `ZOOM_MIN/MAX`, estimated-bytes helper |
| `src/lib/core/document/ImageDocument.ts` | Doc meta, `layers` (1 raster), `view`, `dirty`, `selection` placeholder object |
| `src/lib/core/document/DocumentRegistry.ts` | `openDocuments`, `activeId`, `open(doc)`, `close(id)`, `setActive(id)`; emits change events |
| `src/lib/render/Viewport.ts` | Pure math: `zoomAt(view, mouse, newZoom)`, `screenToImage`, `imageToScreen`, fit calculation |
| `src/lib/render/SurfaceStore.ts` | Surface create/dispose/fill + `surfaceFromBitmap`; the only file (besides `EditorRenderer`) importing Pixi in this slice |
| `src/lib/render/DocScene.ts` | Per-doc container: checker TilingSprite, layer Sprites, `sync(doc)`, `applyView(doc)` |
| `src/lib/render/EditorRenderer.ts` | Owns `Application`; init/resize/dispose; scene attach on active-doc change; renders ticker |
| `src/lib/render/export.ts` | `exportPng(renderer, doc)`: composite minus checker → extract canvas → blob |
| `src/lib/services/fileService.ts` | Decode + validate files → create doc + surface; `newDocument(w,h,bg)`; triggers export |
| `src/lib/services/commandRegistry.ts` | `register(def)`, `run(id)`, `isEnabled(id)` |
| `src/lib/services/menuService.ts` | Static menu tree for this slice; items reference command ids; disabled placeholders |
| `src/lib/services/shortcutService.ts` | Keydown handler → command registry; ignores editable targets; `preventDefault` on match |
| `src/lib/services/dialogService.ts` | Small store: currently-open dialog type + payload |
| `src/lib/state/documents.ts` | Adapter store: `{ docs: DocMeta[]; activeId: string \| null }` from registry events |
| `src/lib/state/ui.ts` | `activeToolId`, `statusBar` (zoom%, cursor pos), dialog store re-export |
| `src/lib/components/shell/MenuBar.svelte` | Renders `menuService` tree; open/close on click/hover, Esc closes |
| `src/lib/components/shell/TabBar.svelte` | Tabs from `state/documents`; close buttons; active switch |
| `src/lib/components/shell/Toolbar.svelte` | Vertical icon buttons (emoji icons), active highlight via `ui` store |
| `src/lib/components/shell/Sidebar.svelte` | Right column with two empty placeholder cards ("History", "Layers") |
| `src/lib/components/shell/ColorBar.svelte` | Fg/bg swatch pair UI (inert this slice; native color inputs) |
| `src/lib/components/shell/StatusBar.svelte` | Zoom %, cursor pos, doc size, device max-texture note |
| `src/lib/components/canvas/EditorCanvas.svelte` | Hosts `<canvas>`; bootstraps `EditorRenderer`; wheel (non-passive) + pointer handlers → Viewport/pan; feeds status bar; drag-drop target |
| `src/lib/components/start/StartScreen.svelte` | Big drop zone, Open…, New… |
| `src/lib/components/dialogs/DialogHost.svelte` | Renders dialog from `dialogService` |
| `src/lib/components/dialogs/NewImageDialog.svelte` | Width/height/preset/background/validation → `fileService.newDocument` |

**Modify:**

| File | Change |
|---|---|
| `App.svelte` (or scaffold page) | Grid layout wiring all shell parts; shows StartScreen when `activeId === null`; `oncontextmenu` suppression on root |
| `app.css` / Tailwind theme | Dark palette CSS variables (bg, panel, border, accent, text) |

**Icon mapping suggestion** (evaluate per icon; fall back to a small custom SVG where Fluent Emoji is unsuitable — e.g., arrow-based tools like Move/Crop):

| Tool | Candidate | Note |
|---|---|---|
| Pencil / Brush | ✏️ / 🖌️ | good fit |
| Eraser | 🧽 | good fit |
| Paint Bucket | 🪣 | acceptable |
| Rectangle/Ellipse Select | 🔲 / ⭕ (or custom SVG) | evaluate |
| Move | custom SVG (4-arrows) or ✋ | emoji weak here |
| Eyedropper | 💧 | acceptable |
| Text | 🅰️ | acceptable |
| Shapes | 📐 / 📏 | acceptable |

## 8. npm Dependencies
- **`pixi.js` (v8.x)** — the only new dependency this slice. Required for all rendering; nothing else can provide GPU-accelerated raster compositing with this maturity.
- **No other dependency.** File open/save, DnD, shortcuts, UUIDs: native APIs. Icons: the already-installed Fluent-UI-Emoji Svelte package. If its exact import paths are unclear, check its README once — do **not** add a second icon package.

## 9. Implementation Steps
*(Each step ends in a runnable state.)*

1. **Verify the project base.** Check `package.json`: note the Svelte major version (4 or 5) and Tailwind version; write components in that version's idioms consistently (Svelte 5: runes; Svelte 4: `writable` stores — the plan works with both because the domain layer is framework-free). Install `pixi.js`.
2. **Core primitives.** Create `id.ts`, `events.ts`, `geometry.ts`, `limits.ts`. Pure TS, no imports beyond stdlib.
3. **Domain documents.** `ImageDocument` + `DocumentRegistry` with events (`documentOpened`, `documentClosed`, `activeChanged`). Smoke-test in console: open a fake doc object, check events fire.
4. **Renderer bootstrap.** `EditorRenderer` with async `init(canvas, size)` (`preference: 'webgl'`, `backgroundAlpha: 0`), ResizeObserver-driven resize, dispose on unmount. Mount in `EditorCanvas.svelte`; verify the ticker runs and the canvas fills its grid cell (`min-height: 0` on flex/grid parents!).
5. **Viewport math.** Implement `Viewport.ts` with the zoom/pan formulas from §6.2. Temporarily log `zoomAt` results on wheel to verify math before wiring.
6. **Surfaces.** `SurfaceStore.create`, `fill`, `surfaceFromBitmap` (via `Texture.from`), `dispose`. No readbacks.
7. **DocScene.** Checker TilingSprite (8×8 two-gray pattern texture, constant screen-size tiles via `tileScale = 1/zoom`), layer Sprite per layer, `sync(doc)` + `applyView(doc)`. Attach active scene to stage; swap on `activeChanged`.
8. **Open files.** `fileService.openFiles(FileList)`: `createImageBitmap` → validate (decode error → toast/message; > `MAX_PIXELS` or > device max texture → reject with message) → doc + surface → registry. Do not `close()` the ImageBitmap (the texture owns it).
9. **Pointer interaction.** In `EditorCanvas.svelte`: manual `addEventListener('wheel', handler, { passive: false })` in `onMount` → `zoomAt` (exp formula, clamp) → mutate `doc.view`; middle-drag + Space-drag pan; pointer position → status store (image coords). Verify checker + image zoom smoothly and the pixel under the cursor stays put.
10. **Start screen + New Image dialog.** StartScreen (drop zone with `dragover` styling, Open button, New button); `NewImageDialog` with validation → `fileService.newDocument` (Transparent = cleared surface, White/Custom = `fill`). Wire DnD also onto the editor area (drop while a doc is open opens new tabs).
11. **Tabs.** `TabBar.svelte` from the documents store; close (button + middle-click) → registry; switch → registry. Confirm each tab's zoom/pan is preserved on switch (it must be, since view lives on the doc).
12. **Commands + menus + shortcuts.** `commandRegistry` with File/View commands (`isEnabled` checks: doc open required for save/close/zoom ops); `menuService` static tree incl. disabled placeholders; `MenuBar.svelte`; `shortcutService` (keydown on window; skip when `target` is inside `input/textarea/[contenteditable]`; `preventDefault` on match). Zoom menu commands reuse the same zoomAt code with canvas-center anchor.
13. **Export.** `export.ts`: render doc scene without checker into temp RT → `extract.canvas` → `toBlob` → object-URL download (`<a download>`). Wire `Ctrl+S`.
14. **Status bar.** Zoom %, doc WxH, cursor pos.
15. **Toolbar + ColorBar + Sidebar placeholders.** Emoji icons from the installed package; click sets `activeToolId` (visual only). ColorBar displays fg/bg swatches with native color inputs (state stored in `ui.ts`; unused by tools yet).
16. **Dark mode polish + context-menu suppression.** CSS-variable palette, hover/active states on menus/tabs/buttons, 1px borders, compact sizes; `oncontextmenu` preventDefault on the app root element only.

## 10. Acceptance Criteria
- App launches dark-mode into the start screen with no console errors
- PNG (and JPEG/WebP) open via picker, via start-screen drop, and via drop on the editor
- Oversize images (e.g., 20000×200 or 12000×12000) are rejected with a clear message, never a crash
- New Image dialog creates transparent/colored canvases; presets fill dimensions; invalid input is blocked inline
- Wheel zoom is anchored at the pointer at all zoom levels; zoom range clamps at 1%–3200%
- Middle-drag and Space+drag pan; Space in a text input types a space (no hijack)
- Two+ documents coexist as tabs; switching preserves each doc's zoom/pan independently
- Export downloads a PNG whose pixel content and dimensions match the document
- Shortcuts work and don't fire while typing in the New Image dialog inputs
- Right-click inside the app shows no browser context menu; right-click on the page *outside* the app root still shows the normal menu (e.g., during development)
- Window resize re-fits the canvas without stretching

## 11. Manual Test Checklist
- [ ] Open app → start screen visible, drop zone reacts to hover/dragover
- [ ] Click "Open…", choose PNG → image renders over checkerboard
- [ ] Drag a second PNG onto the editor → second tab appears, first tab's zoom unchanged after switching back
- [ ] Drop 3 files at once → 3 tabs
- [ ] Scroll wheel over image at various points → zooms toward cursor; verify with status-bar cursor coords that the pixel under the cursor stays fixed
- [ ] Zoom to 3200% and back to fit (`Ctrl+0`, `Ctrl+1`) — no jitter, checker tiles stay constant size
- [ ] Pan via middle-button and Space+left-drag
- [ ] "New…" → 1920×1080 preset, transparent → checkerboard-only canvas; paint-ready (no crash on resize to window)
- [ ] New with custom magenta background → magenta canvas
- [ ] Enter 20000 width → inline validation error
- [ ] Open a huge file (> 67 MP) → friendly rejection
- [ ] `Ctrl+S` → PNG downloads, opens correctly in OS viewer
- [ ] Close all tabs → back to start screen; close middle tab → neighbors intact
- [ ] Menus: File/View entries work; Edit/Adjustments/… visible but disabled; Esc closes open menu
- [ ] Type `4` in New Image width field → no shortcut side effects (no zoom change)
- [ ] Right-click on canvas → no browser menu
- [ ] DevTools console clean during all of the above

## 12. Risks and Pitfalls
- **Pixi v7-style code against the v8 package** (the #1 DeepSeek Flash failure mode): options-in-constructor, `app.view`, `render(container, renderTexture, …)` signatures — all changed. Follow the §6.4 cheat sheet exactly.
- **Wheel listener passivity**: Svelte `on:wheel` / default `addEventListener` on some browsers → `preventDefault()` silently ignored → browser page-zoom steals the gesture. Use explicit `addEventListener('wheel', …, { passive: false })`.
- **DPR/coordinate drift**: mix `app.screen` (logical px) with `offsetX`/`getBoundingClientRect` consistently; never mix physical and logical pixels in one formula.
- **Async init races**: pointer/wheel handlers and commands must no-op until `EditorRenderer.init()` resolved (guard flag).
- **Canvas sizing**: CSS must give the canvas cell a definite size (`min-width/height: 0` in grid/flex) or the ResizeObserver loop never settles.
- **ImageBitmap lifetime**: closing the bitmap while the texture references it → broken texture; never close after `Texture.from`.
- **Memory on close**: closing a tab must dispose its surfaces and scene (`app.destroy` only on component teardown).
- **Svelte version mixing**: runes + `export let` + `$:` in one file breaks compilation — pick one idiom per component.
- **Context menu suppression scope**: attach to the app root element, not `window` (requirement: don't break the rest of the page).

## 13. Architectural Feedback Points
- Does the fixed desktop layout feel right at 1366×768 and 2560×1440 (no responsive redesign, but is anything cramped)?
- Zoom factor/step feel (the `k` constant) — collect impressions before Slice 2 builds on it
- Tab strip behavior when >8 documents (overflow strategy needed?)
- Icon quality: which Fluent Emoji candidates look wrong and need custom SVG?
- Confirm the installed icon package's import pattern works with tree-shaking in the build
- Decision for Slice 2: proceed with the full painting slice, or split "tool infrastructure + brush only" first if Slice 1 revealed integration friction
- Svelte version in use — record it; it decides whether Slice 2's settings popover uses runes or stores

---

# 15. Stop Point

**This is where the plan stops.** No implementation code has been written, and Slice 2 will not be started until:

1. Slice 1 has been implemented,
2. the manual test checklist has been run, and
3. you have given feedback (including any adjustments to zoom feel, layout, icon choices, or the slice order).

The architecture above is deliberately sized to survive feedback: the `SurfaceId` seam, the command registry, and the per-document scene graph are the only "future-proofing" investments — everything else can be reshaped slice by slice.