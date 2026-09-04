// Layer: render (pixi). GPU brush/eraser stroke engine.
//
// Strategy: the stroke is rasterised as overlapping dabs (filled circles)
// spaced by the Spacing slider — at small spacing they fuse into one crisp
// round-cap stroke, at large spacing they separate into dotted/beaded lines —
// and the whole dab set is then softened by a single GPU blur (anti-aliased
// mode). The blur produces a continuous, distance-like alpha falloff, so there
// are no discrete bands, no double-alpha accumulation from overlapping dabs,
// and no stepping/banding. Everything is GPU-side (no CPU<->GPU readbacks);
// sampling is distance-based (independent of pointer event frequency and
// velocity).

import { CanvasSource, Container, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import type { Point, Rect } from '../core/geometry';
import type { RGBA } from '../core/color';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';

export type PaintToolKind = 'brush' | 'pencil' | 'eraser';

export interface PaintSettings {
	kind: PaintToolKind;
	size: number; // diameter in image px
	opacity: number; // 0..1
	hardness: number; // 0..1
	color: RGBA;
	/** paint spacing as a fraction of `size` (Paint.NET style). Controls the
	 * distance between the stamped dabs of the path. */
	spacingRatio?: number;
	/** anti-aliased (soft) edges when true (default); false renders hard,
	 * pixel-crisp edges at the full brush size (hardness is ignored, like a
	 * pencil). */
	antiAlias?: boolean;
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}

function rgbToInt(c: RGBA): number {
	return ((Math.round(c.r) & 0xff) << 16) | ((Math.round(c.g) & 0xff) << 8) | (Math.round(c.b) & 0xff);
}

function getDabAlpha(dist: number, r: number, hardness: number, antiAlias: boolean): number {
	if (!antiAlias) {
		return dist <= r ? 1 : 0;
	}

	const coreR = r * clamp(hardness, 0, 1);
	const aaR = Math.min(coreR, Math.max(0, r - 0.5));

	if (dist <= aaR) return 1;

	const maxR = r - aaR < 1 ? r + 0.5 : r;
	if (dist >= maxR) return 0;

	const t = clamp((dist - aaR) / (maxR - aaR), 0, 1);
	// Smoothstep falloff: 1 - (3t^2 - 2t^3)
	return 1 - (3 * t * t - 2 * t * t * t);
}

const dabTextureCache = new Map<string, Texture>();

function getDabTexture(size: number, hardness: number, antiAlias: boolean): Texture {
	const key = `${size}_${hardness.toFixed(2)}_${antiAlias}`;
	let cached = dabTextureCache.get(key);
	if (cached) return cached;

	const r = size / 2;
	const dim = Math.max(2, Math.ceil(size) + 4);
	const cx = dim / 2;
	const cy = dim / 2;

	const canvas = document.createElement('canvas');
	canvas.width = dim;
	canvas.height = dim;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get 2d context for dab texture');

	const imgData = ctx.createImageData(dim, dim);
	const data = imgData.data;

	for (let y = 0; y < dim; y++) {
		for (let x = 0; x < dim; x++) {
			const dx = x + 0.5 - cx;
			const dy = y + 0.5 - cy;
			const dist = Math.hypot(dx, dy);

			const alpha = getDabAlpha(dist, r, hardness, antiAlias);

			const idx = (y * dim + x) * 4;
			const aByte = Math.round(alpha * 255);
			data[idx] = 255;
			data[idx + 1] = 255;
			data[idx + 2] = 255;
			data[idx + 3] = aByte;
		}
	}

	ctx.putImageData(imgData, 0, 0);

	const source = new CanvasSource({ resource: canvas });
	cached = new Texture({ source });
	dabTextureCache.set(key, cached);

	if (dabTextureCache.size > 100) {
		const firstKey = dabTextureCache.keys().next().value;
		if (firstKey) {
			dabTextureCache.get(firstKey)?.destroy(true);
			dabTextureCache.delete(firstKey);
		}
	}

	return cached;
}

export class BrushEngine {
	private renderer: EditorRenderer;

	// current session state
	private doc: ImageDocument | null = null;
	private layerId: SurfaceId | null = null;
	private settings: PaintSettings | null = null;
	private bufferActive = false;

	// path polyline (image coords, lightly thinned)
	private path: Point[] = [];
	private dirtyRect: Rect | null = null;
	private rafPending = false;

	constructor(renderer: EditorRenderer) {
		this.renderer = renderer;
	}

	get drawing(): boolean {
		return this.bufferActive;
	}

	/** Starts a stroke on the active document with the given settings. */
	begin(settings: PaintSettings, start?: Point): boolean {
		const doc = documentRegistry.active;
		const stroke = this.renderer.getActiveStroke();
		if (!doc || !stroke) return false;

		this.doc = doc;
		this.layerId = doc.activeLayer?.surfaceId ?? null;
		if (!this.layerId) return false;
		this.settings = settings;
		this.bufferActive = true;
		this.path = [];
		this.dirtyRect = null;
		this.rafPending = false;

		stroke.overlay.visible = true;
		const eff = settings.kind === 'eraser' ? 0.45 : settings.opacity * (settings.color.a / 255);
		stroke.overlay.alpha = eff;
		stroke.overlay.tint = settings.kind === 'eraser' ? 0xffffff : rgbToInt(settings.color);

		if (start) this.lineTo(start);
		return true;
	}

	/** Adds a path point (spacing-controlled thinning). Points are snapped to
	 * the pixel grid so a plain click always stamps an IDENTICAL dab no matter
	 * where on the canvas it lands (Paint.NET behaviour) — sub-pixel centres
	 * would rasterise the circle/blur edge slightly differently per position. */
	lineTo(p: Point): void {
		if (!this.bufferActive) return;
		const q = { x: Math.round(p.x), y: Math.round(p.y) };
		const last = this.path[this.path.length - 1];
		const ratio = Math.max(0.02, this.settings?.spacingRatio ?? 0.15);
		const thin = Math.max(0.5, (this.settings!.size || 4) * ratio);
		if (!last || Math.hypot(q.x - last.x, q.y - last.y) >= thin) {
			this.path.push(q);
		}
		if (!this.rafPending) {
			this.rafPending = true;
			requestAnimationFrame(() => {
				this.rafPending = false;
				this.rasterize();
			});
		}
	}

	/** Rasterise: stamp radial-falloff dabs with MAX blending into pooled preview buffer. */
	private rasterize(): void {
		const stroke = this.renderer.getActiveStroke();
		const doc = this.doc;
		const s = this.settings;
		if (!stroke || !doc || !s || !this.bufferActive || this.path.length === 0) return;

		const size = s.size;
		const aa = s.kind !== 'pencil' && s.antiAlias !== false;
		const hardness = s.kind === 'pencil' ? 1 : clamp(s.hardness, 0, 1);
		const margin = size / 2 + 4;

		let pminX = Infinity;
		let pminY = Infinity;
		let pmaxX = -Infinity;
		let pmaxY = -Infinity;
		for (const p of this.path) {
			if (p.x < pminX) pminX = p.x;
			if (p.y < pminY) pminY = p.y;
			if (p.x > pmaxX) pmaxX = p.x;
			if (p.y > pmaxY) pmaxY = p.y;
		}
		const left = Math.max(pminX - margin, -margin);
		const top = Math.max(pminY - margin, -margin);
		const right = Math.min(pmaxX + margin, doc.width + margin);
		const bottom = Math.min(pmaxY + margin, doc.height + margin);
		const fullRect: Rect = {
			x: Math.floor(left),
			y: Math.floor(top),
			width: Math.ceil(right) - Math.floor(left),
			height: Math.ceil(bottom) - Math.floor(top)
		};
		if (fullRect.width <= 0 || fullRect.height <= 0) return;

		const dx = Math.max(0, fullRect.x);
		const dy = Math.max(0, fullRect.y);
		const dw = Math.min(doc.width, fullRect.x + fullRect.width) - dx;
		const dh = Math.min(doc.height, fullRect.y + fullRect.height) - dy;
		if (dw <= 0 || dh <= 0) return;
		this.dirtyRect = { x: dx, y: dy, width: dw, height: dh };

		const dabTex = getDabTexture(size, hardness, aa);
		const wrap = new Container();

		const step = Math.max(0.5, Math.min(2, size * Math.max(0.02, s.spacingRatio ?? 0.1)));

		const addDab = (x: number, y: number) => {
			const sprite = new Sprite(dabTex);
			sprite.anchor.set(0.5, 0.5);
			sprite.position.set(x, y);
			sprite.blendMode = 'max';
			wrap.addChild(sprite);
		};

		if (this.path.length === 1) {
			addDab(this.path[0].x, this.path[0].y);
		} else {
			addDab(this.path[0].x, this.path[0].y);
			for (let i = 0; i < this.path.length - 1; i++) {
				const p1 = this.path[i];
				const p2 = this.path[i + 1];
				const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
				if (dist <= 0) continue;
				const nSteps = Math.ceil(dist / step);
				for (let j = 1; j <= nSteps; j++) {
					const t = j / nSteps;
					addDab(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t);
				}
			}
		}

		this.renderer.app.renderer.render({ container: wrap, target: stroke.target, clear: true });
		wrap.destroy({ children: true });
	}

	/** Commits the stroke into the layer, records undo/redo, cleans up. */
	finish(): boolean {
		const doc = this.doc;
		const layerId = this.layerId;
		const stroke = this.renderer.getActiveStroke();
		const s = this.settings;
		if (!doc || !layerId || !stroke || !s || !this.bufferActive) {
			this.cancel();
			return false;
		}
		if (this.path.length === 0) {
			this.cancel();
			return false;
		}
		if (this.rafPending) {
			this.rafPending = false;
			this.rasterize();
		}
		const rect = this.dirtyRect;
		if (!rect || rect.width <= 0 || rect.height <= 0) {
			this.cancel();
			return false;
		}

		const surfaces = this.renderer.surfaces;
		const eff = s.kind === 'eraser' ? s.opacity : s.opacity * (s.color.a / 255);

		// Surface-swap undo (like the blur effect): never write into the live
		// layer; build a NEW layer surface = current content + stroke, then swap
		// the layer's surfaceId. Undo/redo only swap the reference back/forth,
		// which is guaranteed to restore the exact pixels (no in-place blend).
		const afterId = surfaces.copyRegion(layerId, { x: 0, y: 0, width: doc.width, height: doc.height });

		// Selection clip: when the document has an active selection the stroke
		// may only land inside it. The stroke target holds an alpha-only WHITE
		// dab mask (colour/opacity applied on the composite sprite below), so we
		// first render a masked copy of that content — {sprite(stroke), masked by
		// a sprite of the selection mask texture} into a scratch doc-sized RT.
		// A Sprite mask takes Pixi's AlphaMask path (content × mask RED channel),
		// which clips exactly the white mask region. The normal/erase composite
		// then runs on the CLIPPED sprite, so colour, per-stroke opacity and
		// erasing semantics stay identical to the unclipped path.
		const maskId = doc.selection.active ? doc.selection.maskId : null;
		let clippedSprite: Sprite | null = null;
		let clippedTex: import('pixi.js').RenderTexture | null = null;
		if (maskId && surfaces.has(maskId)) {
			clippedTex = RenderTexture.create({ width: doc.width, height: doc.height, resolution: 1 });
			const holder = new Container();
			const srcSprite = new Sprite(stroke.target);
			const maskSprite = new Sprite(surfaces.getTexture(maskId));
			maskSprite.position.set(0, 0);
			holder.addChild(srcSprite);
			holder.addChild(maskSprite); // same transform chain as the content
			holder.mask = maskSprite;
			this.renderer.app.renderer.render({ container: holder, target: clippedTex, clear: true });
			holder.destroy({ children: true });
			clippedSprite = new Sprite(clippedTex);
		}

		const comp = clippedSprite ?? new Sprite(stroke.target);
		comp.blendMode = s.kind === 'eraser' ? 'erase' : 'normal';
		comp.alpha = eff;
		comp.tint = s.kind === 'eraser' ? 0xffffff : rgbToInt(s.color);
		// Pixi v8: a blend mode on the render ROOT is ignored — nest the sprite
		// one level so 'erase' (eraser) actually applies.
		const blendHolder = new Container();
		blendHolder.addChild(comp);
		surfaces.renderInto(surfaces.getTexture(afterId), blendHolder, false);
		blendHolder.destroy({ children: true });
		comp.destroy();
		clippedSprite?.destroy();
		if (clippedTex) clippedTex.destroy(true);

		const beforeId = layerId;
		const layerObj = doc.layers.find((l) => l.surfaceId === beforeId);
		if (!layerObj) {
			this.cancel();
			return false;
		}
		layerObj.surfaceId = afterId;
		this.renderer.rebuildActiveLayers();

		stroke.overlay.visible = false;
		surfaces.renderInto(stroke.target, new Container(), true);

		const label = s.kind === 'eraser' ? 'Eraser Stroke' : s.kind === 'pencil' ? 'Pencil Stroke' : 'Brush Stroke';
		doc.history.push({
			label,
			memoryBytes: doc.width * doc.height * 4 * 2,
			undo: () => {
				if (layerObj.surfaceId === afterId) {
					layerObj.surfaceId = beforeId;
					this.renderer.rebuildActiveLayers();
				}
			},
			redo: () => {
				if (layerObj.surfaceId === beforeId) {
					layerObj.surfaceId = afterId;
					this.renderer.rebuildActiveLayers();
				}
			},
			// note: snapshot surfaces are intentionally kept (freed when the
			// document closes) — a memory budget can be added later.
			dispose: () => {}
		});
		doc.setDirty(true);
		documentRegistry.notifyChange(doc);

		this.bufferActive = false;
		this.doc = null;
		this.layerId = null;
		this.settings = null;
		this.path = [];
		this.dirtyRect = null;
		this.rafPending = false;
		return true;
	}

	/** Cancels the stroke (discard) without touching the layer. */
	cancel(): void {
		if (this.bufferActive) {
			const stroke = this.renderer.getActiveStroke();
			if (stroke) {
				stroke.overlay.visible = false;
				this.renderer.surfaces.renderInto(stroke.target, new Container(), true);
			}
		}
		this.bufferActive = false;
		this.doc = null;
		this.layerId = null;
		this.settings = null;
		this.path = [];
		this.dirtyRect = null;
		this.rafPending = false;
	}
}
