// Layer: render (pixi). Clone-stamp engine, Paint.NET style: Alt+click sets
// the source anchor (image px, persists across strokes); each stroke copies
// the active layer into a live working copy, then stamps source content with
// an aligned offset through a soft dab mask. No CPU readbacks in the hot
// path — everything is GPU-side. One undoable surface swap on finish.

import { CanvasSource, Container, Sprite, Texture } from 'pixi.js';
import type { Point } from '../core/geometry';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { Layer, SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';

export interface CloneSettings {
	size: number; // dab diameter in image px
	opacity: number; // 0..1
	hardness: number; // 0..1
	/** paint spacing as a fraction of `size` (Paint.NET style). */
	spacingRatio?: number;
}

function clamp(v: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, v));
}

/** Smoothstep dab falloff (same core as the brush, always anti-aliased). */
export function stampDabFalloff(dist: number, r: number, hardness: number): number {
	const coreR = r * clamp(hardness, 0, 1);
	const aaR = Math.min(coreR, Math.max(0, r - 0.5));
	if (dist <= aaR) return 1;
	const maxR = r - aaR < 1 ? r + 0.5 : r;
	if (dist >= maxR) return 0;
	const t = clamp((dist - aaR) / (maxR - aaR), 0, 1);
	return 1 - (3 * t * t - 2 * t * t * t);
}

const dabCache = new Map<string, Texture>();

/** White radial dab texture (alpha falloff), shared per size/hardness. */
export function stampDabTexture(size: number, hardness: number): Texture {
	const key = `${size.toFixed(2)}_${hardness.toFixed(2)}`;
	const hit = dabCache.get(key);
	if (hit) return hit;
	const r = Math.max(0.5, size / 2);
	const dim = Math.max(2, Math.ceil(size) + 4);
	const c = dim / 2;
	const canvas = document.createElement('canvas');
	canvas.width = dim;
	canvas.height = dim;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to get 2d context for stamp dab texture');
	const img = ctx.createImageData(dim, dim);
	const data = img.data;
	for (let y = 0; y < dim; y++) {
		for (let x = 0; x < dim; x++) {
			const a = stampDabFalloff(Math.hypot(x + 0.5 - c, y + 0.5 - c), r, hardness);
			const o = (y * dim + x) * 4;
			data[o] = 255;
			data[o + 1] = 255;
			data[o + 2] = 255;
			data[o + 3] = Math.round(a * 255);
		}
	}
	ctx.putImageData(img, 0, 0);
	const tex = new Texture({ source: new CanvasSource({ resource: canvas }) });
	dabCache.set(key, tex);
	if (dabCache.size > 60) {
		const firstKey = dabCache.keys().next().value;
		if (firstKey) {
			dabCache.get(firstKey)?.destroy(true);
			dabCache.delete(firstKey);
		}
	}
	return tex;
}

export type CloneBeginResult = 'ok' | 'no-source' | 'none';

export class CloneEngine {
	private renderer: EditorRenderer;
	private doc: ImageDocument | null = null;
	private layer: Layer | null = null;
	private settings: CloneSettings | null = null;
	private beforeId: SurfaceId | null = null;
	private workId: SurfaceId | null = null;
	private sourceId: SurfaceId | null = null;
	private selMaskId: SurfaceId | null = null;
	private anchor: Point | null = null;
	private offset: Point = { x: 0, y: 0 };
	private active = false;
	private lastDab: Point | null = null;
	private acc = 0;

	constructor(renderer: EditorRenderer) {
		this.renderer = renderer;
	}

	get drawing(): boolean {
		return this.active;
	}

	get hasSource(): boolean {
		return !!this.anchor;
	}

	/** Sets the clone source anchor (stays put across strokes). */
	setSource(p: Point): void {
		this.anchor = { x: Math.round(p.x), y: Math.round(p.y) };
	}

	/** Starts a stroke: live working copy + aligned offset from the anchor. */
	begin(settings: CloneSettings, start: Point): CloneBeginResult {
		const doc = documentRegistry.active;
		const layer = doc?.activeLayer;
		if (!doc || !layer) return 'none';
		if (!this.anchor) return 'no-source';
		const surfaces = this.renderer.surfaces;
		if (!surfaces.has(layer.surfaceId)) return 'none';
		this.doc = doc;
		this.layer = layer;
		this.settings = { spacingRatio: 0.15, ...settings };
		this.beforeId = layer.surfaceId;
		this.sourceId = layer.surfaceId;
		this.selMaskId = doc.selection.active ? doc.selection.maskId : null;
		const workId = surfaces.copyRegion(layer.surfaceId, { x: 0, y: 0, width: doc.width, height: doc.height });
		this.workId = workId;
		layer.surfaceId = workId;
		this.renderer.rebuildActiveLayers();
		// Aligned mode: the offset is fixed for the whole stroke.
		this.offset = { x: start.x - this.anchor.x, y: start.y - this.anchor.y };
		this.active = true;
		this.lastDab = null;
		this.acc = 0;
		this.stamp(start);
		return 'ok';
	}

	/** Extends the stroke with spacing (Paint.NET-style dab walk). */
	lineTo(p: Point): void {
		if (!this.active || !this.doc || !this.settings) return;
		const step = Math.max(1, this.settings.size * (this.settings.spacingRatio ?? 0.15));
		if (!this.lastDab) {
			this.stamp(p);
			return;
		}
		let dx = p.x - this.lastDab.x;
		let dy = p.y - this.lastDab.y;
		let dist = Math.hypot(dx, dy);
		while (this.acc + dist >= step && dist > 1e-6) {
			const t = (step - this.acc) / dist;
			const nx = this.lastDab.x + dx * t;
			const ny = this.lastDab.y + dy * t;
			this.stamp({ x: nx, y: ny });
			dx = p.x - nx;
			dy = p.y - ny;
			dist = Math.hypot(dx, dy);
			this.acc = 0;
		}
		this.acc += dist;
	}

	/** Stamps source content at `dab` through the soft dab mask. */
	private stamp(dab: Point): void {
		const doc = this.doc;
		const s = this.settings;
		if (!doc || !s || !this.workId || !this.sourceId) return;
		const surfaces = this.renderer.surfaces;
		if (!surfaces.has(this.workId) || !surfaces.has(this.sourceId)) return;
		const srcPt = { x: dab.x - this.offset.x, y: dab.y - this.offset.y };
		const src = new Sprite(surfaces.getTexture(this.sourceId));
		src.position.set(dab.x - srcPt.x, dab.y - srcPt.y);
		const mask = new Sprite(stampDabTexture(s.size, s.hardness));
		mask.anchor.set(0.5, 0.5);
		mask.position.set(dab.x, dab.y);
		mask.alpha = s.opacity;
		const inner = new Container();
		inner.addChild(src);
		inner.addChild(mask);
		inner.mask = mask;
		let root: Container = inner;
		let outer: Container | null = null;
		if (this.selMaskId && surfaces.has(this.selMaskId)) {
			outer = new Container();
			const sel = new Sprite(surfaces.getTexture(this.selMaskId));
			outer.addChild(inner);
			outer.addChild(sel);
			outer.mask = sel;
			root = outer;
		}
		surfaces.renderInto(surfaces.getTexture(this.workId), root, false);
		inner.destroy({ children: true });
		outer?.destroy({ children: true });
		this.lastDab = { x: dab.x, y: dab.y };
	}

	/** Commits the stroke as one history entry. */
	finish(): boolean {
		if (!this.active || !this.doc || !this.layer || !this.workId || !this.beforeId) {
			this.reset();
			return false;
		}
		const doc = this.doc;
		const layer = this.layer;
		const { workId, beforeId } = this;
		const renderer = this.renderer;
		const surfaces = renderer.surfaces;
		doc.history.push({
			label: 'Clone Stamp',
			memoryBytes: doc.width * doc.height * 4 * 2,
			undo: () => {
				if (layer.surfaceId === workId) {
					layer.surfaceId = beforeId;
					renderer.rebuildActiveLayers();
				}
			},
			redo: () => {
				if (layer.surfaceId === beforeId) {
					layer.surfaceId = workId;
					renderer.rebuildActiveLayers();
				}
			},
			dispose: () => {
				if (layer.surfaceId === workId) surfaces.dispose(beforeId);
				else surfaces.dispose(workId);
			}
		});
		doc.setDirty(true);
		documentRegistry.notifyChange(doc);
		this.reset();
		return true;
	}

	/** Aborts the stroke and restores the pristine layer. */
	cancel(): void {
		if (this.active && this.layer && this.beforeId && this.layer.surfaceId === this.workId) {
			this.layer.surfaceId = this.beforeId;
			this.renderer.rebuildActiveLayers();
		}
		if (this.active && this.workId && this.renderer.surfaces.has(this.workId)) {
			this.renderer.surfaces.dispose(this.workId);
		}
		this.reset();
	}

	private reset(): void {
		this.doc = null;
		this.layer = null;
		this.settings = null;
		this.beforeId = null;
		this.workId = null;
		this.sourceId = null;
		this.selMaskId = null;
		this.active = false;
		this.lastDab = null;
		this.acc = 0;
	}
}
