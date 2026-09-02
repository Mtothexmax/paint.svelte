// Layer: render (pixi). One scene graph per open document.

import { Container, Sprite, TilingSprite, Texture } from 'pixi.js';
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
	}

	/**
	 * Applies the document view transform to the scene. Called on attach and on
	 * every zoom/pan so the active document reflects the latest view.
	 */
	applyView(zoom: number, panX: number, panY: number): void {
		this.root.scale.set(zoom, zoom);
		this.root.position.set(panX, panY);
		// Keep checker squares constant in screen space: a BASE-px texture cell
		// is scaled by tileScale * zoom, so tileScale = BASE-screen / (BASE*zoom).
		this.checker.tileScale.set(BASE / (BASE * zoom), BASE / (BASE * zoom));
		// When magnified at/above 100% show hard pixels (no smoothing); below 100%
		// (fit/downscaled) fall back to linear sampling so it looks smoother.
		this.setCrisp(zoom >= 1);
	}

	/** nearest vs linear sampling for the layer sprites (toggled on zoom). */
	private setCrisp(crisp: boolean): void {
		if (crisp === this.crisp) return;
		this.crisp = crisp;
		const mode = crisp ? 'nearest' : 'linear';
		for (const sprite of this.layerSprites) {
			if (sprite.texture?.source) sprite.texture.source.scaleMode = mode;
		}
	}

	/** Frees GPU resources (textures are owned by the SurfaceStore). */
	dispose(): void {
		this.root.destroy({ children: true });
	}
}
