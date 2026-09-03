// Layer: render (pixi). One scene graph per open document.

import { Container, Graphics, RenderTexture, Sprite, Texture, TilingSprite, type Filter } from 'pixi.js';
import type { ImageDocument } from '../core/document/ImageDocument';
import type { Point } from '../core/geometry';
import type { Layer } from '../core/layers/Layer';
import { checkerTexture } from './checkerboard';
import type { SurfaceStore } from './SurfaceStore';

const SQUARE = 8; // checker square in screen px
const BASE = SQUARE * 2; // texture side in image px (2 squares)

// Ants/selection-outline metrics, defined in SCREEN px and divided by the zoom
// when stroking (the overlay lives inside the zoomed scene root, so widths and
// dashes are converted to image px to stay constant on screen).
const ANT_HALO_SCREEN = 2.6; // outer (white) pass width on screen
const ANT_CORE_SCREEN = 1.2; // inner (dark) pass width on screen
const ANT_DASH_ON_SCREEN = 6;
const ANT_DASH_OFF_SCREEN = 4;

/** Adds a closed polyline (all loop points + back to the first). */
function addClosedLoop(g: Graphics, pts: Point[]): void {
	if (pts.length < 2) return;
	g.moveTo(pts[0].x, pts[0].y);
	for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
	g.lineTo(pts[0].x, pts[0].y);
}

/**
 * Adds a dashed version of a closed polyline. Each edge carries its own dash
 * pattern (phase restarts per edge) so short edges — dense lasso points, small
 * rects — never produce corner-cutting diagonals. Cosmetic only.
 */
function addDashedLoop(g: Graphics, pts: Point[], onImg: number, offImg: number): void {
	const n = pts.length;
	if (n < 2 || !(onImg > 0)) return;
	for (let i = 0; i < n; i++) {
		const a = pts[i];
		const b = pts[(i + 1) % n];
		const len = Math.hypot(b.x - a.x, b.y - a.y);
		if (!(len > 0)) continue;
		let travelled = 0;
		let on = true;
		let remaining = onImg;
		while (travelled < len) {
			const step = Math.min(remaining, len - travelled);
			const t0 = travelled / len;
			const t1 = (travelled + step) / len;
			g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0);
			if (on) g.lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
			travelled += step;
			remaining -= step;
			if (remaining <= 0) {
				on = !on;
				remaining = on ? onImg : offImg;
			}
		}
	}
}

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

	// --- selection overlay state ----------------------------------------
	/** Always the LAST child of `root`: a group holding the translucent blue
	 * selection indicator (tint) below the dashed ants outline. */
	private top = new Container();
	/** Dashed ants / transient tool-draft outline (image space). */
	private ants = new Graphics();
	/** Translucent blue veil showing exactly what is selected (mask texture). */
	private tintSprite: Sprite | null = null;
	/** Floating "moved selection" content preview (image space). Rendered
	 * between the blue tint and the ants outline while the Move tool drags the
	 * selected pixels around. */
	private floating: Sprite | null = null;
	/** Outline currently displayed (image-space loops); re-stroked on zoom. */
	private outlineLoops: Point[][] | null = null;
	private outlineDashed = true;
	/** Zoom of the last applyView — widths/dashes are derived from it. */
	private zoom = 1;
	/** Mask texture that clips the live stroke preview, and its mask sprite. */
	private strokeClipTexture: Texture | null = null;
	private strokeClipSprite: Sprite | null = null;

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
		this.top.addChild(this.ants);
		this.root.addChild(this.top);
		this.raiseTop();
		this.applyView(doc.view.zoom, doc.view.panX, doc.view.panY);
	}

	/** Keeps the selection-overlay group the last child of `root`, i.e. above
	 * every layer sprite and the live-stroke overlay. */
	private raiseTop(): void {
		if (this.top.parent !== this.root) this.root.addChild(this.top);
		this.root.removeChild(this.top);
		this.root.addChild(this.top);
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
		this.raiseTop(); // selection indicator + ants stay above everything
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
			// A selection may already be active when the overlay is created —
			// apply the pending clip texture now.
			if (this.strokeClipTexture) this.applyStrokeClip(this.strokeClipTexture);
			this.raiseTop();
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
		this.zoom = zoom;
		this.root.scale.set(zoom, zoom);
		this.root.position.set(panX, panY);
		// Keep checker squares constant in screen space.
		this.checker.tileScale.set(BASE / (BASE * zoom), BASE / (BASE * zoom));
		// Zooming in at/above 100% always shows the real pixels (nearest
		// sampling); below 100% linear sampling keeps the downscale smooth.
		this.setCrisp(zoom >= 1);
		// Ants line width/dash lengths are expressed in screen px, so the
		// outline must be re-stroked whenever the zoom changes.
		if (this.outlineLoops) this.strokeOutline();
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

	// --- selection overlay -------------------------------------------------

	/**
	 * Shows (or hides) the selection ants / tool-draft outline. `loops` are
	 * closed image-space point lists; each loop is stroked twice — a wide white
	 * pass under a narrow dark pass — so the line stays visible on both dark
	 * and light pixels. Widths and dash lengths are in screen px (converted via
	 * the current zoom), so the outline looks identical at any zoom level.
	 */
	showSelectionOutline(loops: Point[][] | null, dashed: boolean): void {
		this.outlineLoops = loops && loops.length ? loops : null;
		this.outlineDashed = dashed;
		this.strokeOutline();
	}

	/** Clears the selection overlay (ants + drafts). */
	clearSelectionOutline(): void {
		this.showSelectionOutline(null, true);
	}

	/** (Re)strokes the stored outline at the current zoom. */
	private strokeOutline(): void {
		this.ants.clear();
		const loops = this.outlineLoops;
		if (!loops) return;
		const z = Math.max(this.zoom, 1e-4);
		const pass = (color: number, widthScreen: number) => {
			for (const loop of loops) {
				if (!loop || loop.length < 2) continue;
				if (this.outlineDashed) addDashedLoop(this.ants, loop, ANT_DASH_ON_SCREEN / z, ANT_DASH_OFF_SCREEN / z);
				else addClosedLoop(this.ants, loop);
			}
			this.ants.stroke({
				width: widthScreen / z,
				color,
				alpha: 1,
				cap: 'butt',
				join: 'miter'
			});
		};
		pass(0xffffff, ANT_HALO_SCREEN); // white halo underneath
		pass(0x111111, ANT_CORE_SCREEN); // dark core on top
	}

	/**
	 * Shows/hides the translucent blue veil that indicates the selected region
	 * (Paint.NET style). The indicator samples the selection-mask texture: it is
	 * a light-blue tint over exactly the pixels that are selected, which makes
	 * donut/complement selections obvious.
	 */
	setSelectionTint(texture: Texture | null): void {
		if (!texture) {
			if (this.tintSprite) {
				this.top.removeChild(this.tintSprite);
				this.tintSprite.destroy();
				this.tintSprite = null;
				this.raiseTop();
			}
			return;
		}
		if (!this.tintSprite) {
			this.tintSprite = new Sprite(texture);
			this.tintSprite.tint = 0x8fc7ff; // light blue veil
			this.tintSprite.alpha = 0.32;
			this.top.addChildAt(this.tintSprite, 0); // below the ants outline
			this.raiseTop();
		} else {
			this.tintSprite.texture = texture;
		}
	}

	/**
	 * Shows/hides the floating content of a selection being moved (Move tool).
	 * `texture` is a bounds-sized surface; `x`/`y` place it in image px. The
	 * sprite sits above the blue tint but below the ants outline.
	 */
	setFloatingTexture(texture: Texture | null, x = 0, y = 0): void {
		if (!texture) {
			if (this.floating) {
				this.top.removeChild(this.floating);
				this.floating.destroy();
				this.floating = null;
			}
			return;
		}
		if (!this.floating) {
			this.floating = new Sprite(texture);
			this.top.addChildAt(this.floating, this.top.getChildIndex(this.ants));
			this.raiseTop();
		}
		this.floating.texture = texture;
		this.floating.position.set(x, y);
	}

	/**
	 * Attaches/detaches a Sprite alpha-mask to the live stroke overlay, so an
	 * in-progress stroke preview is clipped by the active selection (the commit
	 * path applies the same clip in BrushEngine). `null` removes the clip.
	 *
	 * A Sprite mask uses Pixi's AlphaMask path (the child's pixels are
	 * multiplied by the mask sprite's RED channel), so the doc-sized white mask
	 * surface clips exactly where it is painted.
	 */
	setStrokeClipTexture(texture: Texture | null): void {
		this.strokeClipTexture = texture;
		if (texture && !this.strokeOverlay) {
			// Overlay not allocated yet — ensureStroke() applies the pending clip.
			return;
		}
		this.applyStrokeClip(texture);
	}

	private applyStrokeClip(texture: Texture | null): void {
		if (this.strokeClipSprite) {
			if (this.strokeOverlay) this.strokeOverlay.mask = null;
			this.strokeClipSprite.destroy();
			this.strokeClipSprite = null;
		}
		if (!texture || !this.strokeOverlay) return;
		const sprite = new Sprite(texture);
		sprite.position.set(0, 0);
		// Parent to the ROOT (same image-space as the overlay) so the mask
		// shares the overlay's transform chain; Pixi marks the sprite
		// non-renderable once it is assigned as a mask, so it never draws.
		this.root.addChild(sprite);
		this.strokeOverlay.mask = sprite;
		this.strokeClipSprite = sprite;
	}

	/** Frees GPU resources (textures are owned by the SurfaceStore). */
	dispose(): void {
		this.root.destroy({ children: true });
		if (this.strokeBuffer) {
			this.strokeBuffer.destroy(true);
			this.strokeBuffer = null;
		}
		this.strokeOverlay = null;
		this.strokeClipSprite = null;
		this.strokeClipTexture = null;
		this.outlineLoops = null;
	}
}
