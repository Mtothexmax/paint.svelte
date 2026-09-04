// Layer: render (pixi). Move-tool engine, Paint.NET style: the first drag
// INSIDE the selection lifts the selected pixels into a floating preview
// (through the mask) and erases them from the layer; the floating content can
// then be re-dragged any number of times. NOTHING is written to the document
// until the selection is DROPPED — click outside the selection, Enter, or a
// tool switch — which commits pixels + selection (mask + geometry) as ONE
// undoable step. Escape cancels and restores the original state. Works for
// any selection the mask can express: simple shapes, complements (donuts) and
// combined add/subtract regions.

import { Rectangle, Sprite } from 'pixi.js';
import type { Point, Rect } from '../core/geometry';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { Layer, SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { blitMaskedInto, boundsOfLoops, complementMaskSurface } from './selection';

export type MoveBeginResult = 'ok' | 'none';
export type TransformHandle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'pivot' | 'rotate';

export class MoveEngine {
	private renderer: EditorRenderer;

	// session state — valid while `active` (floating or being dragged)
	private doc: ImageDocument | null = null;
	private layer: Layer | null = null;
	private beforeId: SurfaceId | null = null;
	private erasedId: SurfaceId | null = null;
	private floatingId: SurfaceId | null = null;
	private bounds: Rect | null = null;
	private offset: Point = { x: 0, y: 0 };
	private pivot: Point = { x: 0, y: 0 };
	private scaleX = 1;
	private scaleY = 1;
	private rotation = 0;

	// drag-in-flight state
	private origin: Point | null = null; // press point of the current drag
	private baseOffset: Point = { x: 0, y: 0 }; // offset when the drag started
	private active = false;

	constructor(renderer: EditorRenderer) {
		this.renderer = renderer;
	}

	/** True while a lifted (floating) selection exists — dropped only via drop(). */
	get floating(): boolean {
		return this.active;
	}

	get transformState(): { bounds: Rect; pivot: Point; offset: Point; scaleX: number; scaleY: number; rotation: number } | null {
		if (!this.bounds) return null;
		return {
			bounds: { ...this.bounds },
			pivot: { ...this.pivot },
			offset: { ...this.offset },
			scaleX: this.scaleX,
			scaleY: this.scaleY,
			rotation: this.rotation
		};
	}

	/** True when the current selection mask covers the given image point. A 1×1
	 * GPU read-back of the mask surface — mask-authoritative, so donut holes
	 * count as "outside". */
	pointInSelection(p: Point): boolean {
		const doc = documentRegistry.active;
		const sel = doc?.selection;
		if (!doc || !sel?.maskId || !this.renderer.surfaces.has(sel.maskId)) return false;
		const pt = this.active ? { x: p.x - this.offset.x, y: p.y - this.offset.y } : p;
		const x = Math.floor(pt.x);
		const y = Math.floor(pt.y);
		if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return false;
		const sprite = new Sprite(this.renderer.surfaces.getTexture(sel.maskId));
		const px = this.renderer.app.renderer.extract.pixels({
			target: sprite,
			frame: new Rectangle(x, y, 1, 1),
			resolution: 1
		});
		sprite.destroy();
		return px.pixels[3] > 0;
	}

	/**
	 * Lifts the selection content of the active layer: the floating pixels are
	 * shown at the selection bounds, the layer itself shows the erased "hole".
	 * The document is NOT changed undoably until drop().
	 */
	begin(): MoveBeginResult {
		if (this.active) return 'ok';
		const doc = documentRegistry.active;
		const sel = doc?.selection;
		const layer = doc?.activeLayer;
		if (!doc || !sel || !layer || !sel.active || !sel.maskId) return 'none';
		const surfaces = this.renderer.surfaces;
		if (!surfaces.has(sel.maskId) || !surfaces.has(layer.surfaceId)) return 'none';

		const w = doc.width;
		const h = doc.height;
		const bounds = sel.bounds ?? { x: 0, y: 0, width: w, height: h };

		// 1) floating content = layer pixels × selection mask, cropped to bounds
		const full = surfaces.create(w, h);
		blitMaskedInto(surfaces, sel.maskId, layer.surfaceId, full, 'normal', w, h);
		const floatingId = surfaces.copyRegion(full, bounds);
		surfaces.dispose(full);

		// 2) erased layer = "keep" content (everything NOT selected) — the same
		//    exact-transparency path Delete uses (no premultiplied residue)
		const keepId = complementMaskSurface(surfaces, sel.maskId, w, h);
		const erasedId = surfaces.create(w, h);
		blitMaskedInto(surfaces, keepId, layer.surfaceId, erasedId, 'normal', w, h);
		surfaces.dispose(keepId);

		this.doc = doc;
		this.layer = layer;
		this.beforeId = layer.surfaceId;
		this.erasedId = erasedId;
		this.floatingId = floatingId;
		this.bounds = bounds;
		this.offset = { x: 0, y: 0 };
		this.pivot = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
		this.scaleX = 1;
		this.scaleY = 1;
		this.rotation = 0;
		this.baseOffset = { x: 0, y: 0 };
		this.origin = null;
		this.active = true;

		layer.surfaceId = erasedId;
		this.renderer.rebuildActiveLayers();
		this.renderer.setActiveFloating(surfaces.getTexture(floatingId), bounds.x, bounds.y);
		return 'ok';
	}

	/** Starts a drag gesture at image point `p` (offsets are relative to it). */
	beginDrag(p: Point): void {
		if (!this.active) return;
		this.origin = { x: Math.round(p.x), y: Math.round(p.y) };
		this.baseOffset = { x: this.offset.x, y: this.offset.y };
	}

	/** Moves the floating preview by the drag offset (integer image px) and
	 * shifts the ants + tint veil along. Cheap: sprite positions + outline. */
	moveTo(p: Point): void {
		if (!this.active || !this.doc || !this.bounds || !this.origin) return;
		const dx = this.baseOffset.x + Math.round(p.x - this.origin.x);
		const dy = this.baseOffset.y + Math.round(p.y - this.origin.y);
		if (dx === this.offset.x && dy === this.offset.y) return;
		this.offset = { x: dx, y: dy };
		const surfaces = this.renderer.surfaces;
		if (!this.floatingId || !surfaces.has(this.floatingId)) return;
		this.renderer.setActiveFloating(surfaces.getTexture(this.floatingId), this.bounds.x + dx, this.bounds.y + dy);
		this.applyFloatingTransform();
		this.renderer.previewTransformedSelectionOutline(this.pivot, this.offset, this.scaleX, this.scaleY, this.rotation);
		this.renderer.setActiveTintTransform(
			this.pivot.x,
			this.pivot.y,
			this.offset.x,
			this.offset.y,
			this.scaleX,
			this.scaleY,
			this.rotation
		);
	}

	/** Starts a resize, pivot move, or rotation gesture. */
	beginTransform(handle: TransformHandle, p: Point): void {
		if (!this.active || !this.bounds) return;
		this.origin = { ...p };
		this.baseOffset = { ...this.offset };
		this.transformHandle = handle;
		this.transformStart = {
			offset: { ...this.offset },
			pivot: { ...this.pivot },
			scaleX: this.scaleX,
			scaleY: this.scaleY,
			rotation: this.rotation
		};
	}

	setPivot(p: Point): void {
		if (!this.active || !this.bounds) return;
		this.pivot = { ...p };
		this.applyFloatingTransform();
		this.renderer.previewTransformedSelectionOutline(this.pivot, this.offset, this.scaleX, this.scaleY, this.rotation);
		this.renderer.setActiveTintTransform(this.pivot.x, this.pivot.y, this.offset.x, this.offset.y, this.scaleX, this.scaleY, this.rotation);
	}

	private transformHandle: TransformHandle = 'move';
	private transformStart = {
		offset: { x: 0, y: 0 },
		pivot: { x: 0, y: 0 },
		scaleX: 1,
		scaleY: 1,
		rotation: 0
	};

	transformTo(p: Point, shift = false, alt = false): void {
		if (!this.active || !this.bounds || !this.origin) return;
		const start = this.transformStart;
		const b = this.bounds;
		if (this.transformHandle === 'move') {
			this.offset = {
				x: start.offset.x + Math.round(p.x - this.origin.x),
				y: start.offset.y + Math.round(p.y - this.origin.y)
			};
		} else if (this.transformHandle === 'pivot') {
			// The pivot marker is displayed at pivot + offset. Keep the
			// transform offset fixed so moving this UI control does not move
			// the selected pixels.
			this.pivot = {
				x: Math.round(p.x - start.offset.x),
				y: Math.round(p.y - start.offset.y)
			};
			this.offset = { ...start.offset };
			return;
		} else if (this.transformHandle === 'rotate') {
			const center = {
				x: this.pivot.x + this.offset.x,
				y: this.pivot.y + this.offset.y
			};
			const angle = Math.atan2(p.y - center.y, p.x - center.x);
			const startAngle = Math.atan2(this.origin.y - center.y, this.origin.x - center.x);
			let next = start.rotation + angle - startAngle;
			if (shift) next = Math.round((next * 180) / Math.PI / 10) * (Math.PI / 18);
			this.rotation = next;
		} else {
			const deltaX = p.x - this.origin.x;
			const deltaY = p.y - this.origin.y;
			const anchorX = this.transformHandle.includes('w') ? b.x + b.width : this.transformHandle.includes('e') ? b.x : b.x + b.width / 2;
			const anchorY = this.transformHandle.includes('n') ? b.y + b.height : this.transformHandle.includes('s') ? b.y : b.y + b.height / 2;
			const movingX = this.transformHandle.includes('w')
				? b.x + deltaX
				: this.transformHandle.includes('e')
					? b.x + b.width + deltaX
					: b.x + b.width / 2;
			const movingY = this.transformHandle.includes('n')
				? b.y + deltaY
				: this.transformHandle.includes('s')
					? b.y + b.height + deltaY
					: b.y + b.height / 2;
			const baseX = this.transformHandle.includes('w') ? -b.width : this.transformHandle.includes('e') ? b.width : 1;
			const baseY = this.transformHandle.includes('n') ? -b.height : this.transformHandle.includes('s') ? b.height : 1;
			let sx = this.transformHandle.includes('w') || this.transformHandle.includes('e') ? (movingX - anchorX) / baseX : 1;
			let sy = this.transformHandle.includes('n') || this.transformHandle.includes('s') ? (movingY - anchorY) / baseY : 1;
			if (shift) {
				const magnitude = Math.max(Math.abs(sx), Math.abs(sy));
				if (this.transformHandle === 'n' || this.transformHandle === 's') sx = Math.sign(sx || 1) * Math.abs(sy);
				else if (this.transformHandle === 'e' || this.transformHandle === 'w') sy = Math.sign(sy || 1) * Math.abs(sx);
				else {
					sx = Math.sign(sx || 1) * magnitude;
					sy = Math.sign(sy || 1) * magnitude;
				}
			}
			this.scaleX = Math.abs(sx) < 0.001 ? (sx < 0 ? -0.001 : 0.001) : sx;
			this.scaleY = Math.abs(sy) < 0.001 ? (sy < 0 ? -0.001 : 0.001) : sy;
			if (alt) {
				this.offset = { ...start.offset };
			} else {
				this.offset = {
					x: start.offset.x + anchorX - (this.pivot.x + (anchorX - this.pivot.x) * this.scaleX),
					y: start.offset.y + anchorY - (this.pivot.y + (anchorY - this.pivot.y) * this.scaleY)
				};
			}
		}
		this.applyFloatingTransform();
		this.renderer.previewTransformedSelectionOutline(this.pivot, this.offset, this.scaleX, this.scaleY, this.rotation);
		this.renderer.setActiveTintTransform(
			this.pivot.x,
			this.pivot.y,
			this.offset.x,
			this.offset.y,
			this.scaleX,
			this.scaleY,
			this.rotation
		);
	}

	private applyFloatingTransform(): void {
		if (!this.floatingId) return;
		this.renderer.setActiveFloatingTransform(
			this.pivot.x,
			this.pivot.y,
			this.offset.x,
			this.offset.y,
			this.scaleX,
			this.scaleY,
			this.rotation
		);
	}

	/**
	 * Drops the floating selection: builds the after-layer (erased + floating
	 * content at the new position), moves the selection mask/geometry by the
	 * same offset and records everything as one history entry. A zero-offset
	 * session restores the original state instead (nothing moved).
	 * Returns false when nothing was committed.
	 */
	drop(): boolean {
		if (!this.active || !this.doc || !this.layer || !this.bounds) {
			this.cancel();
			return false;
		}
		const doc = this.doc;
		const layer = this.layer;
		const surfaces = this.renderer.surfaces;
		// surfaces vanished (document closed mid-session) → bail out silently
		if (
			!this.beforeId ||
			!this.erasedId ||
			!this.floatingId ||
			!surfaces.has(this.beforeId) ||
			!surfaces.has(this.erasedId) ||
			!surfaces.has(this.floatingId) ||
			!doc.selection.active
		) {
			this.reset();
			return false;
		}
		const dx = this.offset.x;
		const dy = this.offset.y;
		if (dx === 0 && dy === 0 && this.scaleX === 1 && this.scaleY === 1 && this.rotation === 0) {
			this.cancel();
			return false;
		}

		const w = doc.width;
		const h = doc.height;
		const beforeId = this.beforeId;
		const erasedId = this.erasedId;
		const floatingId = this.floatingId;
		const bounds = this.bounds;

		// after = erased layer + floating content at the new position
		const afterId = surfaces.copyRegion(erasedId, { x: 0, y: 0, width: w, height: h });
		surfaces.blitTransformed(
			floatingId,
			afterId,
			this.pivot.x - bounds.x,
			this.pivot.y - bounds.y,
			this.pivot.x,
			this.pivot.y,
			dx,
			dy,
			this.scaleX,
			this.scaleY,
			this.rotation
		);

		// move the selection (mask surface + geometry) by the same offset
		const sel = doc.selection;
		const oldMaskId = sel.maskId;
		const newMaskId = surfaces.create(w, h);
		if (oldMaskId && surfaces.has(oldMaskId))
			surfaces.blitTransformed(oldMaskId, newMaskId, this.pivot.x, this.pivot.y, this.pivot.x, this.pivot.y, dx, dy, this.scaleX, this.scaleY, this.rotation);

		const origRect = sel.rect ? { ...sel.rect } : null;
		const origPoints = sel.points?.map((pt) => ({ ...pt })) ?? null;
		const origBounds = sel.bounds ? { ...sel.bounds } : null;
		const origComposite = sel.composite;
		const origInverted = sel.inverted;
		const origOutlineLoops = sel.outlineLoops?.map((loop) => loop.map((pt) => ({ ...pt }))) ?? null;
		const movedRect = origRect ? { x: origRect.x + dx, y: origRect.y + dy, width: origRect.width, height: origRect.height } : null;
		const movedPoints = origPoints?.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) ?? null;
		const movedBounds = origBounds ? { x: origBounds.x + dx, y: origBounds.y + dy, width: origBounds.width, height: origBounds.height } : null;

		sel.maskId = newMaskId;
		sel.rect = movedRect;
		sel.points = movedPoints;
		sel.bounds = movedBounds;
		if (this.scaleX !== 1 || this.scaleY !== 1 || this.rotation !== 0) {
			sel.composite = true;
			sel.inverted = false;
			sel.outlineLoops = this.renderer.computeMaskOutline(newMaskId, w, h);
			sel.bounds = boundsOfLoops(sel.outlineLoops) ?? movedBounds;
		} else if (sel.composite) {
			// combined selections have no single geometry — the ants and bounds
			// must be re-derived from the moved mask surface
			sel.outlineLoops = this.renderer.computeMaskOutline(newMaskId, w, h);
			sel.bounds = boundsOfLoops(sel.outlineLoops) ?? movedBounds;
		} else {
			sel.outlineLoops = null;
		}
		const afterRect = sel.rect ? { ...sel.rect } : null;
		const afterPoints = sel.points?.map((pt) => ({ ...pt })) ?? null;
		const afterBounds = sel.bounds ? { ...sel.bounds } : null;
		const afterComposite = sel.composite;
		const afterInverted = sel.inverted;
		const afterOutlineLoops = sel.outlineLoops?.map((loop) => loop.map((pt) => ({ ...pt }))) ?? null;

		layer.surfaceId = afterId;
		this.renderer.rebuildActiveLayers();
		this.renderer.setActiveFloating(null);
		surfaces.dispose(erasedId);
		surfaces.dispose(floatingId);
		const layerId = layer.id;
		this.reset();

		doc.setDirty(true);
		doc.history.push({
			label: 'Move Selection',
			memoryBytes: w * h * 4 * 4, // before/after layer + old/new mask
			undo: () => {
				if (layer.surfaceId === afterId) {
					layer.surfaceId = beforeId;
					this.renderer.rebuildActiveLayers();
				}
				if (sel.maskId === newMaskId) {
					sel.maskId = oldMaskId;
					sel.rect = origRect;
					sel.points = origPoints;
					sel.bounds = origBounds;
					sel.composite = origComposite;
					sel.inverted = origInverted;
					sel.outlineLoops = origOutlineLoops;
					this.renderer.refreshActiveSelection();
				}
			},
			redo: () => {
				if (layer.surfaceId === beforeId) {
					layer.surfaceId = afterId;
					this.renderer.rebuildActiveLayers();
				}
				if (sel.maskId === oldMaskId) {
					sel.maskId = newMaskId;
					sel.rect = afterRect;
					sel.points = afterPoints;
					sel.bounds = afterBounds;
					sel.composite = afterComposite;
					sel.inverted = afterInverted;
					sel.outlineLoops = afterOutlineLoops;
					this.renderer.refreshActiveSelection();
				}
			},
			dispose: () => {
				// free whichever snapshot is NOT the live surface (same policy as Delete)
				if (layer.surfaceId === afterId) {
					surfaces.dispose(beforeId);
					if (sel.maskId === newMaskId && oldMaskId) surfaces.dispose(oldMaskId);
				} else {
					surfaces.dispose(afterId);
					if (sel.maskId === oldMaskId) surfaces.dispose(newMaskId);
				}
			}
		});
		documentRegistry.notifyChange(doc);
		this.renderer.refreshActiveSelection();
		return true;
	}

	/** Aborts the session: restores the untouched layer and drops the previews. */
	cancel(): void {
		if (!this.active) {
			this.reset();
			return;
		}
		const surfaces = this.renderer.surfaces;
		if (
			this.doc &&
			this.layer &&
			this.beforeId &&
			surfaces.has(this.beforeId) &&
			this.layer.surfaceId === this.erasedId
		) {
			this.layer.surfaceId = this.beforeId;
			this.renderer.rebuildActiveLayers();
		}
		if (this.erasedId && surfaces.has(this.erasedId)) surfaces.dispose(this.erasedId);
		if (this.floatingId && surfaces.has(this.floatingId)) surfaces.dispose(this.floatingId);
		this.renderer.setActiveFloating(null);
		this.reset();
		this.renderer.refreshActiveSelection();
	}

	private reset(): void {
		this.doc = null;
		this.layer = null;
		this.beforeId = null;
		this.erasedId = null;
		this.floatingId = null;
		this.bounds = null;
		this.origin = null;
		this.baseOffset = { x: 0, y: 0 };
		this.offset = { x: 0, y: 0 };
		this.pivot = { x: 0, y: 0 };
		this.scaleX = 1;
		this.scaleY = 1;
		this.rotation = 0;
		this.active = false;
	}
}
