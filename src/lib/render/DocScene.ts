// Layer: render (pixi). One scene graph per open document.

import { Container, RenderTexture, Sprite, TilingSprite, type Filter } from 'pixi.js';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { Layer } from '../core/layers/Layer';
import { checkerTexture } from './checkerboard';
import type { SurfaceStore } from './SurfaceStore';

const SQUARE = 8; // checker square in screen px
const BASE = SQUARE * 2; // texture side in image px (2 squares)

export class DocScene {
	readonly doc: ImageDocument;
	/** Attach/detach this to the stage to show/hide the document. */
	readonly root = new Container();
	private checker: TilingSprite;
	private layerSprites: Sprite[] = [];
	/** Pooled per-document stroke buffer (doc-sized) + its live-preview overlay. */
	private strokeBuffer: RenderTexture | null = null;
	private strokeOverlay: Sprite | null = null;
	private crisp = false;

	constructor(doc: ImageDocument, surfaces: SurfaceStore) {
		this.doc = doc;
		this.checker = new TilingSprite({
			texture: checkerTexture(SQUARE),
			width: doc.width,
			height: doc.height
		});
		this.checker.roundPixels = false;
		this.root.addChild(this.checker);
		this.rebuildLayers(surfaces);
		this.applyView(doc.view.zoom, doc.view.panX, doc.view.panY);
	}

	private rebuildLayers(surfaces: SurfaceStore): void {
		for (const sprite of this.layerSprites) {
			this.root.removeChild(sprite);
			sprite.destroy();
		}
		this.layerSprites = this.doc.layers.map((layer: Layer) => {
			const texture = surfaces.getTexture(layer.surfaceId);
			const sprite = new Sprite(texture);
			sprite.alpha = layer.opacity;
			sprite.visible = layer.visible;
			this.root.addChild(sprite);
			return sprite;
		});
		if (this.strokeOverlay) this.root.addChild(this.strokeOverlay); // keep stroke on top
	}

	/** Rebuilds layer sprites after a surface swap (e.g. after an effect). */
	resync(surfaces: SurfaceStore): void {
		this.rebuildLayers(surfaces);
		this.setCrisp(this.crisp);
	}

	/** Lazily allocates the pooled stroke buffer + overlay (doc-sized). */
	ensureStroke(): { target: RenderTexture; overlay: Sprite } {
		if (!this.strokeBuffer || !this.strokeOverlay) {
			this.strokeBuffer = RenderTexture.create({ width: this.doc.width, height: this.doc.height, resolution: 1 });
			this.strokeOverlay = new Sprite(this.strokeBuffer);
			this.strokeOverlay.visible = false;
			if (this.strokeBuffer.source) {
				this.strokeBuffer.source.scaleMode = this.crisp ? 'nearest' : 'linear';
				this.strokeBuffer.source.style.update();
			}
			this.root.addChild(this.strokeOverlay);
		}
		return { target: this.strokeBuffer, overlay: this.strokeOverlay };
	}

	/** True when the live-preview overlay is currently shown. */
	get strokeActive(): boolean {
		return !!this.strokeOverlay?.visible;
	}

	// Live filter preview on the ACTIVE layer sprite (used by effect dialogs).
	private previewFilter: Filter | null = null;

	/** Applies/removes a temporary filter preview on the active layer. */
	setActiveLayerFilter(filter: Filter | null): void {
		if (this.previewFilter) {
			this.previewFilter.destroy();
			this.previewFilter = null;
		}
		const idx = this.doc.layers.findIndex((l) => l.id === this.doc.activeLayerId);
		const sprite = idx >= 0 ? this.layerSprites[idx] : null;
		if (sprite) sprite.filters = null;
		if (filter && sprite) {
			this.previewFilter = filter;
			sprite.filters = [filter];
		}
	}

	/** Applies the document view transform to the scene. Called on attach and on
	 * every zoom/pan so the active document reflects the latest view. */
	applyView(zoom: number, panX: number, panY: number): void {
		this.root.scale.set(zoom, zoom);
		this.root.position.set(panX, panY);
		// Keep checker squares constant in screen space.
		this.checker.tileScale.set(BASE / (BASE * zoom), BASE / (BASE * zoom));
		// Zooming in at/above 100% always shows the real pixels (nearest
		// sampling); below 100% linear sampling keeps the downscale smooth.
		this.setCrisp(zoom >= 1);
	}

	/** nearest vs linear sampling for the layer + live-stroke sprites. */
	private setCrisp(crisp: boolean): void {
		this.crisp = crisp;
		this.applySampling();
	}

	/** Applies the current sampling mode to EVERY sprite/texture present right
	 * now — must always run (not just on a mode flip), because surfaces are
	 * swapped/created per stroke and a freshly created texture would otherwise
	 * keep its default (linear) sampling while zoomed in.
	 *
	 * NOTE: after changing `source.scaleMode`, `source.style.update()` must be
	 * called — TextureStyle only emits its "change" event from `update()`, so
	 * without it the GPU keeps the previously cached (linear) sampler. */
	private applySampling(): void {
		const mode = this.crisp ? 'nearest' : 'linear';
		for (const sprite of this.layerSprites) {
			const src = sprite.texture?.source;
			if (src && src.scaleMode !== mode) {
				src.scaleMode = mode;
				src.style.update();
			}
		}
		const buf = this.strokeBuffer?.source;
		if (buf && buf.scaleMode !== mode) {
			buf.scaleMode = mode;
			buf.style.update();
		}
	}

	/** Frees GPU resources (textures are owned by the SurfaceStore). */
	dispose(): void {
		this.root.destroy({ children: true });
		if (this.strokeBuffer) {
			this.strokeBuffer.destroy(true);
			this.strokeBuffer = null;
		}
		this.strokeOverlay = null;
	}
}
