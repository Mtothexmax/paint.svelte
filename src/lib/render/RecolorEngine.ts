// Layer: render (pixi). Recolor brush: paints the foreground colour while
// preserving the destination alpha (Paint.NET behaviour).
//
// Live preview paints tinted dabs straight into a working copy (exactly the
// committed look on opaque pixels). The commit then re-derives the result on
// the CPU so alpha is preserved exactly: coverage k comes from stamping the
// very same dab bytes into a 2D canvas (identical 8-bit falloff, same
// source-over accumulation as the GPU preview), out = mix(dst, fg, k) with
// out.a = dst.a. One undoable surface swap, like a brush stroke.

import { CanvasSource, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Point, Rect } from '../core/geometry';
import type { RGBA } from '../core/color';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { Layer, SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { stampDabTexture } from './CloneEngine';
import { eraseSelectionRegion } from './selection';
import { extractStraightRegion } from './readback';

export interface RecolorSettings {
	size: number; // dab diameter in image px
	opacity: number; // 0..1
	hardness: number; // 0..1
	spacingRatio?: number;
	color: RGBA;
}

function rgbToInt(c: RGBA): number {
	return ((Math.round(c.r) & 0xff) << 16) | ((Math.round(c.g) & 0xff) << 8) | (Math.round(c.b) & 0xff);
}

export class RecolorEngine {
	private renderer: EditorRenderer;
	private doc: ImageDocument | null = null;
	private layer: Layer | null = null;
	private settings: RecolorSettings | null = null;
	private beforeId: SurfaceId | null = null;
	private workId: SurfaceId | null = null;
	private selMaskId: SurfaceId | null = null;
	private active = false;
	private lastDab: Point | null = null;
	private acc = 0;
	private dabs: Point[] = [];
	private dirty: { x0: number; y0: number; x1: number; y1: number } | null = null;

	constructor(renderer: EditorRenderer) {
		this.renderer = renderer;
	}

	get drawing(): boolean {
		return this.active;
	}

	/** Starts a stroke on a live working copy of the active layer. */
	begin(settings: RecolorSettings, start: Point): boolean {
		const doc = documentRegistry.active;
		const layer = doc?.activeLayer;
		if (!doc || !layer) return false;
		const surfaces = this.renderer.surfaces;
		if (!surfaces.has(layer.surfaceId)) return false;
		this.doc = doc;
		this.layer = layer;
		this.settings = { spacingRatio: 0.15, ...settings };
		this.beforeId = layer.surfaceId;
		this.selMaskId = doc.selection.active ? doc.selection.maskId : null;
		const workId = surfaces.copyRegion(layer.surfaceId, { x: 0, y: 0, width: doc.width, height: doc.height });
		this.workId = workId;
		layer.surfaceId = workId;
		this.renderer.rebuildActiveLayers();
		this.active = true;
		this.lastDab = null;
		this.acc = 0;
		this.dabs = [];
		this.dirty = null;
		this.stamp(start);
		return true;
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

	/** Paints one tinted dab into the working copy (live preview). */
	private stamp(dab: Point): void {
		const doc = this.doc;
		const s = this.settings;
		if (!doc || !s || !this.workId) return;
		const surfaces = this.renderer.surfaces;
		if (!surfaces.has(this.workId)) return;
		const dabSprite = new Sprite(stampDabTexture(s.size, s.hardness));
		dabSprite.anchor.set(0.5, 0.5);
		dabSprite.position.set(dab.x, dab.y);
		dabSprite.tint = rgbToInt(s.color);
		dabSprite.alpha = s.opacity;
		const inner = new Container();
		inner.addChild(dabSprite);
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
		this.dabs.push({ x: dab.x, y: dab.y });
		const r = s.size / 2 + 2;
		if (!this.dirty) this.dirty = { x0: dab.x - r, y0: dab.y - r, x1: dab.x + r, y1: dab.y + r };
		else {
			this.dirty.x0 = Math.min(this.dirty.x0, dab.x - r);
			this.dirty.y0 = Math.min(this.dirty.y0, dab.y - r);
			this.dirty.x1 = Math.max(this.dirty.x1, dab.x + r);
			this.dirty.y1 = Math.max(this.dirty.y1, dab.y + r);
		}
	}

	/**
	 * Commits the stroke: re-derives the dirty region on the CPU as
	 * mix(dst, fg, coverage) with the ORIGINAL alpha, writes it back, and
	 * records one history entry.
	 */
	finish(): boolean {
		if (!this.active || !this.doc || !this.layer || !this.workId || !this.beforeId || !this.settings) {
			this.reset();
			return false;
		}
		const doc = this.doc;
		const layer = this.layer;
		const s = this.settings;
		const { workId, beforeId } = this;
		const renderer = this.renderer;
		const surfaces = renderer.surfaces;

		const x = Math.max(0, Math.floor((this.dirty?.x0 ?? 0) - 1));
		const y = Math.max(0, Math.floor((this.dirty?.y0 ?? 0) - 1));
		const rw = Math.min(doc.width - x, Math.ceil((this.dirty?.x1 ?? 0) + 1) - x);
		const rh = Math.min(doc.height - y, Math.ceil((this.dirty?.y1 ?? 0) + 1) - y);
		if (rw < 1 || rh < 1 || !this.dabs.length) {
			this.cancel();
			return false;
		}

		// Coverage k per pixel: stamp the exact dab bytes (same 8-bit falloff
		// as the GPU preview) with source-over accumulation.
		const cover = document.createElement('canvas');
		cover.width = rw;
		cover.height = rh;
		const cctx = cover.getContext('2d', { willReadFrequently: true });
		if (cctx) {
			const dabTex = stampDabTexture(s.size, s.hardness);
			const dabCanvas = dabTex.source.resource as HTMLCanvasElement;
			const dim = dabCanvas.width;
			cctx.globalAlpha = s.opacity;
			for (const d of this.dabs) {
				cctx.drawImage(dabCanvas, Math.round(d.x - x - dim / 2), Math.round(d.y - y - dim / 2));
			}
			cctx.globalAlpha = 1;
		}
		const coverage = cctx ? cctx.getImageData(0, 0, rw, rh).data : null;

		const readPatch = (id: SurfaceId): Uint8ClampedArray | null => {
			if (!surfaces.has(id)) return null;
			try {
				// Straight-alpha region bytes (float divide before quantize),
				// so soft-edge hue survives the read.
				const out = extractStraightRegion(renderer, surfaces.getTexture(id), x, y, rw, rh);
				if (out.width !== rw || out.height !== rh) return null;
				return Uint8ClampedArray.from(out.pixels);
			} catch {
				return null;
			}
		};
		const dst = readPatch(beforeId);
		if (!dst) {
			this.cancel();
			return false;
		}

		// out.rgb = mix(dstStraight, fg, k); out.a = dst.a (preserved).
		const patch = document.createElement('canvas');
		patch.width = rw;
		patch.height = rh;
		const pctx = patch.getContext('2d');
		if (!pctx) {
			this.cancel();
			return false;
		}
		const img = pctx.createImageData(rw, rh);
		const out = img.data;
		const fr = Math.round(s.color.r);
		const fg = Math.round(s.color.g);
		const fb = Math.round(s.color.b);
		for (let i = 0; i < rw * rh; i++) {
			const o = i * 4;
			const da = dst[o + 3];
			const k = coverage ? coverage[o + 3] / 255 : 0;
			// dst is straight-alpha bytes (no CPU un-premultiply needed).
			const dr = dst[o];
			const dg = dst[o + 1];
			const db = dst[o + 2];
			out[o] = Math.round(dr + (fr - dr) * k);
			out[o + 1] = Math.round(dg + (fg - dg) * k);
			out[o + 2] = Math.round(db + (fb - db) * k);
			out[o + 3] = da;
		}
		pctx.putImageData(img, 0, 0);

		// Replace the dirty region in the working copy (erase + exact blit).
		const eraseMask = surfaces.create(doc.width, doc.height);
		const white = new Graphics();
		white.rect(x, y, rw, rh).fill(0xffffff);
		surfaces.renderInto(surfaces.getTexture(eraseMask), white, true);
		white.destroy();
		eraseSelectionRegion(surfaces, eraseMask, workId, doc.width, doc.height);
		surfaces.dispose(eraseMask);
		const patchSource = new CanvasSource({ resource: patch });
		const patchTex = new Texture({ source: patchSource });
		const patchSprite = new Sprite(patchTex);
		patchSprite.position.set(x, y);
		surfaces.renderInto(surfaces.getTexture(workId), patchSprite, false);
		patchSprite.destroy();
		patchTex.destroy(true);

		doc.history.push({
			label: 'Recolor',
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
		this.selMaskId = null;
		this.active = false;
		this.lastDab = null;
		this.acc = 0;
		this.dabs = [];
		this.dirty = null;
	}
}
