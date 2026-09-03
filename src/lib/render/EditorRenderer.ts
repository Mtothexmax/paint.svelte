// Layer: render (pixi). Owns the single Pixi Application, per-document scenes,
// surface store and view reconciliation. This is the ONLY place pixi is wired
// to the app lifecycle.

import { Application, Sprite, type Texture } from 'pixi.js';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry, RegistryEvents } from '../core/document/registry';
import type { Point } from '../core/geometry';
import type { SurfaceId } from '../core/layers/Layer';
import { DocScene } from './DocScene';
import { SurfaceStore } from './SurfaceStore';
import { selectionOutlinePoints, traceSelectionOutline } from './selection';

type DocId = string;

export class EditorRenderer {
	app!: Application;
	readonly surfaces = new SurfaceStore();
	private scenes = new Map<DocId, DocScene>();
	private activeScene: DocScene | null = null;
	private cssWidth = 0;
	private cssHeight = 0;
	private disposed = false;
	private unsubs: (() => void)[] = [];

	get viewWidth(): number {
		return this.cssWidth;
	}
	get viewHeight(): number {
		return this.cssHeight;
	}
	get ready(): boolean {
		return !!this.app;
	}

	async init(canvas: HTMLCanvasElement): Promise<void> {
		const app = new Application();
		await app.init({
			canvas,
			preference: 'webgl',
			backgroundAlpha: 0,
			antialias: false,
			autoDensity: true,
			resolution: Math.max(window.devicePixelRatio || 1, 1)
		});
		this.app = app;
		this.surfaces.attach(app);
		this.wireRegistry();
		// Render any documents that were already registered before init finished.
		for (const doc of documentRegistry.all) this.addDoc(doc);
		this.attachActive();
	}

	private wireRegistry(): void {
		this.unsubs.push(
			documentRegistry.events.on(RegistryEvents.opened, (d) => this.addDoc(d as ImageDocument))
		);
		this.unsubs.push(
			documentRegistry.events.on(
				RegistryEvents.active,
				(p) => this.attachActive(((p as { id: DocId | null }).id) ?? null)
			)
		);
		this.unsubs.push(
			documentRegistry.events.on(RegistryEvents.closed, (p) => {
				const { id } = p as { id: DocId; doc: ImageDocument };
				this.removeDoc(id);
			})
		);
	}

	private addDoc(doc: ImageDocument): void {
		if (this.scenes.has(doc.id)) return;
		this.scenes.set(doc.id, new DocScene(doc, this.surfaces));
	}

	private removeDoc(id: DocId): void {
		const scene = this.scenes.get(id);
		if (!scene) return;
		if (this.activeScene === scene) this.activeScene = null;
		scene.dispose();
		this.scenes.delete(id);
		this.disposeSelectionMask(scene.doc);
		for (const layer of scene.doc.layers) this.surfaces.dispose(layer.surfaceId);
	}

	/** Returns (creating on demand) the doc-sized selection-mask surface for a
	 * document. The handle is cached on the domain SelectionModel. */
	ensureSelectionMask(doc: ImageDocument): SurfaceId {
		const existing = doc.selection.maskId;
		if (existing && this.surfaces.has(existing)) return existing;
		const id = this.surfaces.create(doc.width, doc.height);
		doc.selection.maskId = id;
		return id;
	}

	/** Frees the document's selection-mask surface (if any). */
	disposeSelectionMask(doc: ImageDocument): void {
		const id = doc.selection.maskId;
		if (!id) return;
		if (this.surfaces.has(id)) this.surfaces.dispose(id);
		doc.selection.maskId = null;
	}

	attachActive(id: DocId | null = documentRegistry.activeId): void {
		if (this.disposed || !this.app) return;
		if (this.activeScene) {
			this.app.stage.removeChild(this.activeScene.root);
			this.activeScene = null;
		}
		if (id === null) return;
		const scene = this.scenes.get(id);
		if (!scene) return;
		this.activeScene = scene;
		this.app.stage.addChild(scene.root);
		this.refreshActiveView();
		this.refreshActiveSelection();
	}

	/** Re-applies the active document's view transform to its scene. */
	refreshActiveView(): void {
		const doc = documentRegistry.active;
		if (!doc) return;
		const scene = this.activeScene;
		if (!scene) return;
		scene.applyView(doc.view.zoom, doc.view.panX, doc.view.panY);
	}

	/** Returns the active scene's pooled stroke target + preview overlay. */
	getActiveStroke(): { target: import('pixi.js').RenderTexture; overlay: import('pixi.js').Sprite } | null {
		if (!this.activeScene || !documentRegistry.active) return null;
		return this.activeScene.ensureStroke();
	}

	/** Rebuilds the active scene's layer sprites (e.g. after a surface swap). */
	rebuildActiveLayers(): void {
		if (this.activeScene) this.activeScene.resync(this.surfaces);
	}

	/**
	 * Shows/hides the selection overlay on the ACTIVE scene and (re)attaches
	 * the selection mask as the stroke-overlay clip. Called whenever the active
	 * document's selection changes and on every doc switch.
	 */
	refreshActiveSelection(): void {
		if (!this.app) return;
		const doc = documentRegistry.active;
		const scene = this.activeScene;
		if (!doc || !scene) return;
		const sel = doc.selection;
		if (!sel.active) {
			scene.showSelectionOutline(null, true);
			scene.setStrokeClipTexture(null);
			scene.setSelectionTint(null);
			return;
		}
		const loops = this.selectionOutlineLoops(doc);
		scene.showSelectionOutline(loops, true);
		const maskTex = sel.maskId && this.surfaces.has(sel.maskId) ? this.surfaces.getTexture(sel.maskId) : null;
		scene.setStrokeClipTexture(maskTex);
		scene.setSelectionTint(maskTex);
	}

	/**
	 * Transient draft preview (used by the selection tools while dragging,
	 * BEFORE anything is committed to the mask). Replaces the current ants
	 * until refreshActiveSelection() draws the committed state again.
	 */
	previewSelectionOutline(loops: Point[][] | null, dashed = false): void {
		if (this.activeScene) this.activeScene.showSelectionOutline(loops, dashed);
	}

	/** Shows/hides the floating moved-selection content on the ACTIVE scene
	 * (Move tool). `texture` is a bounds-sized surface placed at image `x/y`. */
	setActiveFloating(texture: Texture | null, x = 0, y = 0): void {
		this.activeScene?.setFloatingTexture(texture, x, y);
	}

	/** Live ants preview shifted by (dx,dy) — drawn while the Move tool drags
	 * the selection content, so the outline travels with the floating pixels
	 * until the commit refreshes the selection from the model. */
	previewMovedSelectionOutline(dx: number, dy: number): void {
		const doc = documentRegistry.active;
		if (!doc || !this.activeScene) return;
		const loops = this.selectionOutlineLoops(doc);
		if (!loops) return;
		this.activeScene.showSelectionOutline(
			loops.map((loop) => loop.map((p) => ({ x: p.x + dx, y: p.y + dy }))),
			true
		);
	}

	/** Closed outline loops describing the active selection (mask is the
	 * authority; this is purely for drawing ants). When the mask is the
	 * complement (Invert Selection) the document border is added so the whole
	 * selection boundary is visible. */
	private selectionOutlineLoops(doc: ImageDocument): Point[][] | null {
		const sel = doc.selection;
		const loops: Point[][] = [];
		// Composite (mask-derived) selections use the traced outline loops.
		if (sel.composite) {
			if (sel.outlineLoops?.length) loops.push(...sel.outlineLoops);
			return loops.length ? loops : null;
		}
		const geometry = selectionOutlinePoints(sel.kind, sel.rect, sel.points);
		if (geometry.length) loops.push(geometry);
		if (sel.inverted) {
			loops.push([
				{ x: 0, y: 0 },
				{ x: doc.width, y: 0 },
				{ x: doc.width, y: doc.height },
				{ x: 0, y: doc.height }
			]);
		}
		return loops.length ? loops : null;
	}

	/** Reads a mask surface back to the CPU and returns its outline loops — used
	 * for composite (add/subtract) selections that have no single geometric
	 * shape, so the marching-ants outline can still be drawn around the exact
	 * selected region. Readback is forced to resolution 1: the default would
	 * inherit the renderer's resolution (devicePixelRatio), which silently
	 * shifted the traced outline on scaled displays. */
	computeMaskOutline(maskId: SurfaceId, width: number, height: number): Point[][] {
		if (!this.app) return [];
		const sprite = new Sprite(this.surfaces.getTexture(maskId));
		const extracted = this.app.renderer.extract.pixels({ target: sprite, resolution: 1 });
		sprite.destroy();
		if (extracted.width !== width || extracted.height !== height) return [];
		return traceSelectionOutline(extracted.pixels, width, height);
	}

	/** Temporary live filter preview on the active layer (effect dialogs). */
	setActiveLayerFilterPreview(filter: import('pixi.js').Filter | null): void {
		this.activeScene?.setActiveLayerFilter(filter);
	}

	/** Call whenever the host element's CSS size changes. */
	resize(widthCss: number, heightCss: number): void {
		this.cssWidth = widthCss;
		this.cssHeight = heightCss;
		if (this.app) this.app.renderer.resize(widthCss, heightCss);
	}

	dispose(): void {
		this.disposed = true;
		for (const unsub of this.unsubs) unsub();
		this.unsubs = [];
		for (const scene of this.scenes.values()) scene.dispose();
		this.scenes.clear();
		this.surfaces.disposeAll();
		if (this.app) {
			this.app.destroy(true, { children: true, texture: true, textureSource: true });
		}
	}
}

// --- module-level singleton accessors -----------------------------------

let current: EditorRenderer | null = null;
let resolveReady: ((r: EditorRenderer) => void) | null = null;

/** Resolves once the EditorRenderer has been initialised with a canvas. */
export const rendererReady: Promise<EditorRenderer> = new Promise((resolve) => {
	resolveReady = resolve;
});

/** Creates (once) and returns the app renderer bound to `canvas`. */
export async function initEditorRenderer(canvas: HTMLCanvasElement): Promise<EditorRenderer> {
	if (current && current.ready) return current;
	if (!current) current = new EditorRenderer();
	await current.init(canvas);
	resolveReady?.(current);
	return current;
}

export function getEditorRenderer(): EditorRenderer {
	if (!current) throw new Error('EditorRenderer not initialised yet.');
	return current;
}

export function hasEditorRenderer(): boolean {
	return !!current;
}
