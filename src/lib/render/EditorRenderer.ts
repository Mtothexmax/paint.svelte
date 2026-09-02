// Layer: render (pixi). Owns the single Pixi Application, per-document scenes,
// surface store and view reconciliation. This is the ONLY place pixi is wired
// to the app lifecycle.

import { Application } from 'pixi.js';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry, RegistryEvents } from '../core/document/registry';
import { DocScene } from './DocScene';
import { SurfaceStore } from './SurfaceStore';

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
		for (const layer of scene.doc.layers) this.surfaces.dispose(layer.surfaceId);
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
