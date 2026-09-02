// Layer: render (pixi). GPU brush/eraser stroke engine.
//
// Strategy: the stroke is rasterised as ONE crisp round-capped/round-joined
// path (uniform body, clean caps, no wedge/spike at joins) and then softened by
// a single GPU blur. The blur produces a continuous, distance-like alpha
// falloff — so there are no discrete bands, no double-alpha accumulation from
// overlapping dabs, and no stepping/banding. Everything is GPU-side (no
// CPU<->GPU readbacks); sampling is distance-based (independent of pointer
// event frequency and velocity).

import { BlurFilter, Container, Graphics, Rectangle, Sprite } from 'pixi.js';
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
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function rgbToInt(c: RGBA): number {
	return ((Math.round(c.r) & 0xff) << 16) | ((Math.round(c.g) & 0xff) << 8) | (Math.round(c.b) & 0xff);
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

	/** Adds a path point (thinned so event density doesn't matter). */
	lineTo(p: Point): void {
		if (!this.bufferActive) return;
		const last = this.path[this.path.length - 1];
		const thin = Math.max(0.5, (this.settings!.size || 4) * 0.1);
		if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= thin) {
			this.path.push({ x: p.x, y: p.y });
		}
		if (!this.rafPending) {
			this.rafPending = true;
			requestAnimationFrame(() => {
				this.rafPending = false;
				this.rasterize();
			});
		}
	}

	/** Rasterise: crisp stroked path -> GPU blur -> pooled preview buffer. */
	private rasterize(): void {
		const stroke = this.renderer.getActiveStroke();
		const doc = this.doc;
		const s = this.settings;
		if (!stroke || !doc || !s || !this.bufferActive || this.path.length === 0) return;

		const size = s.size;
		const hardness = clamp(s.hardness, 0.05, 1);
		const core = size * hardness; // crisp stroke width
		const strength = (1 - hardness) * size * 0.42; // blur px (softness)
		// generous transparent border so any filter-edge smear stays far away
		const margin = size / 2 + strength + 8;

		// Region around the path, NOT clamped to the canvas: allow up to `margin`
		// beyond each canvas edge so the blur kernel has full data and the stroke
		// looks like it was drawn on a larger canvas and then cropped.
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

		// The actually-affected area on the canvas (for undo snapshots).
		const dx = Math.max(0, fullRect.x);
		const dy = Math.max(0, fullRect.y);
		const dw = Math.min(doc.width, fullRect.x + fullRect.width) - dx;
		const dh = Math.min(doc.height, fullRect.y + fullRect.height) - dy;
		if (dw <= 0 || dh <= 0) return; // stroke is entirely off-canvas
		this.dirtyRect = { x: dx, y: dy, width: dw, height: dh };

		// Blend an alpha-only WHITE mask (colour applied later via tint) — this
		// avoids premultiplied colour fringes at the blurred edges.
		const MASK = 0xffffff;

		// Render the crisp white path DIRECTLY with the blur filter. The filter
		// region is explicitly pinned to the whole document + explicit padding,
		// so Pixi does NOT derive its intermediate filter bounds from the
		// Graphics geometry (which produced the bottom/right bounding-box lines).
		const filter = new BlurFilter({ strength, resolution: 1 });
		filter.padding = Math.ceil(strength * 2 + 4);
		const wrap = new Container();
		// Path is in image coordinates and the pooled target IS the document —
		// so no extra offset (that shifted the stroke away from the cursor).
		wrap.filterArea = new Rectangle(0, 0, doc.width, doc.height);
		wrap.filters = [filter];

		const g = new Graphics();
		if (this.path.length === 1) {
			// a click is a filled disc (not a degenerate capsule)
			const p = this.path[0];
			g.circle(p.x, p.y, Math.max(0.5, core / 2)).fill(MASK);
		} else {
			g.moveTo(this.path[0].x, this.path[0].y);
			for (let i = 1; i < this.path.length; i++) {
				g.lineTo(this.path[i].x, this.path[i].y);
			}
			g.stroke({ width: core, color: MASK, alpha: 1, cap: 'round', join: 'round' });
		}
		wrap.addChild(g);

		this.renderer.app.renderer.render({ container: wrap, target: stroke.target, clear: true });
		wrap.destroy({ children: true });
		filter.destroy();
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
		const comp = new Sprite(stroke.target);
		comp.blendMode = s.kind === 'eraser' ? 'erase' : 'normal';
		comp.alpha = eff;
		comp.tint = s.kind === 'eraser' ? 0xffffff : rgbToInt(s.color);
		surfaces.renderInto(surfaces.getTexture(afterId), comp, false);
		comp.destroy();

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
