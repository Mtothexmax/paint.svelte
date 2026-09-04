// Layer: render (pixi). Move-Selection tool engine: drags the SELECTION
// (the mask surface + the geometry fields) by the cursor delta WITHOUT
// touching any layer pixels. The visual is updated live by recreating the
// mask at the new offset (a single GPU blit, cheap) on every pointermove;
// on pointer-up a single undoable history entry is recorded. Escape cancels
// the in-progress drag and restores the original mask. The layer's pixels
// are NEVER modified — only the selection itself moves.

import type { Point, Rect } from '../core/geometry';
import type { ImageDocument } from '../core/document/ImageDocument';
import { documentRegistry } from '../core/document/registry';
import type { SurfaceId } from '../core/layers/Layer';
import type { EditorRenderer } from './EditorRenderer';
import { boundsOfLoops, fillShapeMask, invertSelectionMask, selectionOutlinePoints } from './selection';
import { logTransformDebug } from './transformDebug';

export class MoveSelectionEngine {
	private renderer: EditorRenderer;
	private doc: ImageDocument | null = null;

	// Original selection state — captured at begin(), restored on cancel().
	private origMaskId: SurfaceId | null = null;
	private origRect: Rect | null = null;
	private origPoints: Point[] | null = null;
	private origBounds: Rect | null = null;
	private origOutlineLoops: Point[][] | null = null;
	private origComposite = false;
	private origInverted = false;
	private origKind: 'rect' | 'ellipse' | 'lasso' = 'rect';

	// Mask surface produced by the most recent recreateMask(); becomes the
	// committed new mask on commit().
	private newMaskId: SurfaceId | null = null;

	// Drag state.
	private origin: Point | null = null;
	private offset: Point = { x: 0, y: 0 };
	private active = false;
	private pivot: Point = { x: 0, y: 0 };
	private scaleX = 1;
	private scaleY = 1;
	private rotation = 0;
	private transformHandle: import('./MoveEngine').TransformHandle = 'move';
	private transformStart = { pivot: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, scaleX: 1, scaleY: 1, rotation: 0 };

	constructor(renderer: EditorRenderer) {
		this.renderer = renderer;
	}

	/** True while a Move-Selection drag is in progress. */
	get dragging(): boolean {
		return this.active;
	}

	/** Captures the current selection state and arms a drag at image point p.
	 * Returns false when there is no live selection to move. */
	begin(p: Point): boolean {
		if (this.active) return true;
		const doc = documentRegistry.active;
		const sel = doc?.selection;
		if (!doc || !sel || !sel.active || !sel.maskId) return false;
		if (!this.renderer.surfaces.has(sel.maskId)) return false;

		this.doc = doc;
		this.origMaskId = sel.maskId;
		this.origRect = sel.rect ? { ...sel.rect } : null;
		this.origPoints = sel.points ? sel.points.map((pt) => ({ ...pt })) : null;
		this.origOutlineLoops = sel.outlineLoops ? sel.outlineLoops.map((loop) => loop.map((pt) => ({ ...pt }))) : null;
		this.origBounds = this.selectionGeometryBounds(sel);
		this.origComposite = sel.composite;
		this.origInverted = sel.inverted;
		this.origKind = sel.kind;
		this.newMaskId = null;
		this.origin = { x: Math.round(p.x), y: Math.round(p.y) };
		this.offset = { x: 0, y: 0 };
		this.pivot = { x: (this.origBounds?.x ?? 0) + (this.origBounds?.width ?? doc.width) / 2, y: (this.origBounds?.y ?? 0) + (this.origBounds?.height ?? doc.height) / 2 };
		this.scaleX = 1;
		this.scaleY = 1;
		this.rotation = 0;
		this.active = true;
		logTransformDebug('selection.begin', { pointer: p, bounds: this.origBounds, composite: this.origComposite });
		return true;
	}

	private selectionGeometryBounds(sel: {
		bounds: Rect | null;
		rect: Rect | null;
		points: Point[] | null;
		outlineLoops: Point[][] | null;
	}): Rect | null {
		if (sel.outlineLoops?.length) return boundsOfLoops(sel.outlineLoops);
		if (sel.rect) return { ...sel.rect };
		if (sel.points?.length) {
			const xs = sel.points.map((point) => point.x);
			const ys = sel.points.map((point) => point.y);
			return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
		}
		return sel.bounds ? { ...sel.bounds } : null;
	}

	get transformState() {
		const bounds = this.origBounds ?? { x: 0, y: 0, width: this.doc?.width ?? 0, height: this.doc?.height ?? 0 };
		return { bounds: { ...bounds }, pivot: { ...this.pivot }, offset: { ...this.offset }, scaleX: this.scaleX, scaleY: this.scaleY, rotation: this.rotation };
	}

	refreshPreview(): void {
		if (!this.active) return;
		this.renderer.setActiveTintTransform(
			this.pivot.x,
			this.pivot.y,
			this.offset.x,
			this.offset.y,
			this.scaleX,
			this.scaleY,
			this.rotation
		);
		this.renderer.previewTransformedSelectionOutline(this.pivot, this.offset, this.scaleX, this.scaleY, this.rotation);
		logTransformDebug('selection.preview', {
			originalMaskId: this.origMaskId,
			temporaryMaskId: this.newMaskId,
			bounds: this.origBounds,
			offset: this.offset,
			pivot: this.pivot,
			scaleX: this.scaleX,
			scaleY: this.scaleY,
			rotation: this.rotation
		});
	}

	beginTransform(handle: import('./MoveEngine').TransformHandle, p: Point): void {
		if (!this.active) return;
		this.origin = { ...p };
		this.transformHandle = handle;
		this.transformStart = { pivot: { ...this.pivot }, offset: { ...this.offset }, scaleX: this.scaleX, scaleY: this.scaleY, rotation: this.rotation };
		logTransformDebug('selection.beginTransform', { handle, pointer: p, transform: this.transformState });
	}

	transformTo(p: Point, shift = false): void {
		if (!this.active || !this.doc || !this.origin) return;
		const start = this.transformStart;
		const b = this.origBounds ?? { x: 0, y: 0, width: this.doc.width, height: this.doc.height };
		if (this.transformHandle === 'move') {
			this.offset = { x: start.offset.x + Math.round(p.x - this.origin.x), y: start.offset.y + Math.round(p.y - this.origin.y) };
		} else if (this.transformHandle === 'pivot') {
			this.pivot = { x: p.x - this.offset.x, y: p.y - this.offset.y };
		} else if (this.transformHandle === 'rotate') {
			const center = { x: this.pivot.x + this.offset.x, y: this.pivot.y + this.offset.y };
			let angle = Math.atan2(p.y - center.y, p.x - center.x) - Math.atan2(this.origin.y - center.y, this.origin.x - center.x);
			if (shift) angle = Math.round((angle * 180) / Math.PI / 10) * (Math.PI / 18);
			this.rotation = start.rotation + angle;
		} else {
			const anchorX = this.transformHandle.includes('w') ? b.x + b.width : this.transformHandle.includes('e') ? b.x : b.x + b.width / 2;
			const anchorY = this.transformHandle.includes('n') ? b.y + b.height : this.transformHandle.includes('s') ? b.y : b.y + b.height / 2;
			let sx = start.scaleX;
			let sy = start.scaleY;
			if (this.transformHandle.includes('w') || this.transformHandle.includes('e')) {
				const direction = this.transformHandle.includes('w') ? -1 : 1;
				sx = start.scaleX + direction * (p.x - this.origin.x) / Math.max(1, b.width);
			}
			if (this.transformHandle.includes('n') || this.transformHandle.includes('s')) {
				const direction = this.transformHandle.includes('n') ? -1 : 1;
				sy = start.scaleY + direction * (p.y - this.origin.y) / Math.max(1, b.height);
			}
			if (shift) {
				const magnitude = Math.max(Math.abs(sx), Math.abs(sy));
				sx = Math.sign(sx || 1) * magnitude;
				sy = Math.sign(sy || 1) * magnitude;
			}
			this.scaleX = Math.abs(sx) < 0.001 ? (sx < 0 ? -0.001 : 0.001) : sx;
			this.scaleY = Math.abs(sy) < 0.001 ? (sy < 0 ? -0.001 : 0.001) : sy;
			this.offset = {
				x: start.offset.x + anchorX - (this.pivot.x + (anchorX - this.pivot.x) * this.scaleX),
				y: start.offset.y + anchorY - (this.pivot.y + (anchorY - this.pivot.y) * this.scaleY)
			};
		}
		this.recreateMask(true);
		logTransformDebug('selection.transformTo', { pointer: p, shift, handle: this.transformHandle, transform: this.transformState });
	}

	/** Updates the selection mask to reflect the new drag offset. */
	moveTo(p: Point): void {
		if (!this.active || !this.doc || !this.origin) return;
		const dx = Math.round(p.x - this.origin.x);
		const dy = Math.round(p.y - this.origin.y);
		if (dx === this.offset.x && dy === this.offset.y) return;
		this.offset = { x: dx, y: dy };
		this.recreateMask();
		logTransformDebug('selection.moveTo', { pointer: p, offset: this.offset });
	}

	/** Rebuilds the mask surface at the current offset and pushes the new
	 * geometry into the selection model. */
	private recreateMask(transformed = false): void {
		if (!this.doc || !this.origMaskId) return;
		const surfaces = this.renderer.surfaces;
		if (!surfaces.has(this.origMaskId)) return;
		const w = this.doc.width;
		const h = this.doc.height;
		const { x: dx, y: dy } = this.offset;

		// Build a fresh mask = original mask shifted by (dx, dy).
		const nextMaskId = surfaces.create(w, h);
		surfaces.clear(nextMaskId);
		const redrawn = this.paintGeometryMask(nextMaskId, w, h, transformed);
		if (!redrawn) {
			if (transformed)
				surfaces.blitTransformed(this.origMaskId, nextMaskId, this.pivot.x, this.pivot.y, this.pivot.x, this.pivot.y, dx, dy, this.scaleX, this.scaleY, this.rotation);
			else surfaces.blitRegion(this.origMaskId, nextMaskId, dx, dy, 'normal', 1);
		}

		// Dispose the previous per-move mask; the original is left intact so
		// commit()/cancel() can roll back to it without re-deriving it.
		if (this.newMaskId && surfaces.has(this.newMaskId)) surfaces.dispose(this.newMaskId);
		this.newMaskId = nextMaskId;

		// Keep the committed selection model and its original mask untouched
		// during the drag. The temporary full-document mask is only needed for
		// commit; tint and ants use the renderer's transient transform preview.
		this.refreshPreview();
	}

	/** Paints the moved/transformed original shape into a doc-sized mask.
	 * Geometry is rasterized at its destination so pixels that left the
	 * document can re-enter. Returns false when only the (clipped) mask can
	 * be used as a source. */
	private paintGeometryMask(destId: SurfaceId, w: number, h: number, transformed: boolean): boolean {
		if (this.origComposite || (!this.origRect && !this.origPoints)) return false;
		const surfaces = this.renderer.surfaces;
		if (transformed) {
			const outline = selectionOutlinePoints(this.origKind, this.origRect, this.origPoints);
			if (outline.length < 3) return false;
			const points = outline.map((point) => this.transformPoint(point));
			if (this.origInverted) invertSelectionMask(surfaces, destId, w, h, 'lasso', null, points);
			else fillShapeMask(surfaces, destId, w, h, 'lasso', null, points);
			return true;
		}
		const rect = this.origRect
			? { x: this.origRect.x + this.offset.x, y: this.origRect.y + this.offset.y, width: this.origRect.width, height: this.origRect.height }
			: null;
		const points = this.origPoints?.map((pt) => ({ x: pt.x + this.offset.x, y: pt.y + this.offset.y })) ?? null;
		if (this.origInverted) invertSelectionMask(surfaces, destId, w, h, this.origKind, rect, points);
		else fillShapeMask(surfaces, destId, w, h, this.origKind, rect, points);
		return true;
	}

	/** Commits the move as a single history entry. The current mask becomes
	 * the live selection; the original is retained for undo. */
	commit(): boolean {
		if (!this.active || !this.doc) {
			this.reset();
			return false;
		}
		const doc = this.doc;
		const renderer = this.renderer;
		const surfaces = renderer.surfaces;
		const sel = doc.selection;
		const { x: dx, y: dy } = this.offset;
		if (dx === 0 && dy === 0 && this.scaleX === 1 && this.scaleY === 1 && this.rotation === 0) {
			// Nothing to commit — the user clicked but didn't drag. Drop the
			// temporary mask (none was created when the offset stayed 0,0) and
			// leave the selection as it was.
			this.cancel();
			return false;
		}
		const oldMaskId = this.origMaskId;
		const newMaskId = this.newMaskId;
		if (!oldMaskId || !newMaskId || !surfaces.has(oldMaskId) || !surfaces.has(newMaskId)) {
			this.cancel();
			return false;
		}

		// Build the post-move selection state only now. During the drag the
		// committed model still points at the original mask.
		const newRect = this.rotation === 0 && this.scaleX === 1 && this.scaleY === 1 && !this.origComposite && this.origRect
			? { x: this.origRect.x + dx, y: this.origRect.y + dy, width: this.origRect.width, height: this.origRect.height }
			: null;
		const newPoints = newRect || this.origComposite || this.rotation !== 0 || this.scaleX !== 1 || this.scaleY !== 1
			? null
			: this.origPoints?.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) ?? null;
		const transformed = this.rotation !== 0 || this.scaleX !== 1 || this.scaleY !== 1;
		const sourceOutline = this.origOutlineLoops ??
			(this.origRect
				? [[
						{ x: this.origRect.x, y: this.origRect.y },
						{ x: this.origRect.x + this.origRect.width, y: this.origRect.y },
						{ x: this.origRect.x + this.origRect.width, y: this.origRect.y + this.origRect.height },
						{ x: this.origRect.x, y: this.origRect.y + this.origRect.height }
					]]
				: this.origPoints
					? [this.origPoints]
					: null);
		const newOutlineLoops = transformed && sourceOutline
			? sourceOutline.map((loop) => loop.map((point) => this.transformPoint(point)))
			: this.origComposite
				? this.origOutlineLoops?.map((loop) => loop.map((point) => ({ x: point.x + dx, y: point.y + dy }))) ?? null
				: null;
		const newBounds = newOutlineLoops?.length
			? boundsOfLoops(newOutlineLoops)
			: this.origBounds
				? { x: this.origBounds.x + dx, y: this.origBounds.y + dy, width: this.origBounds.width, height: this.origBounds.height }
				: null;
		const newComposite = this.origComposite || this.rotation !== 0 || this.scaleX !== 1 || this.scaleY !== 1;
		const newInverted = this.origInverted;

		sel.maskId = newMaskId;
		sel.rect = newRect;
		sel.points = newPoints;
		sel.bounds = newBounds;
		sel.composite = newComposite;
		sel.inverted = newInverted;
		sel.outlineLoops = newOutlineLoops;
		renderer.refreshActiveSelection();

		// Pre-move state for undo.
		const origRect = this.origRect;
		const origPoints = this.origPoints;
		const origBounds = this.origBounds;
		const origComposite = this.origComposite;
		const origInverted = this.origInverted;
		const origOutlineLoops = this.origOutlineLoops;

		// The new mask is now "live" on the model — release ownership so the
		// history entry can dispose the old one when the new one is dropped.
		this.newMaskId = null;
		this.reset();

		doc.setDirty(true);
		doc.history.push({
			label: 'Move Selection',
			memoryBytes: doc.width * doc.height * 4,
			undo: () => {
				sel.maskId = oldMaskId;
				sel.rect = origRect ? { ...origRect } : null;
				sel.points = origPoints ? origPoints.map((pt) => ({ ...pt })) : null;
				sel.bounds = origBounds ? { ...origBounds } : null;
				sel.composite = origComposite;
				sel.inverted = origInverted;
				sel.outlineLoops = origOutlineLoops ? origOutlineLoops.map((loop) => loop.map((pt) => ({ ...pt }))) : null;
				renderer.refreshActiveSelection();
				documentRegistry.notifyChange(doc);
			},
			redo: () => {
				sel.maskId = newMaskId;
				sel.rect = newRect ? { ...newRect } : null;
				sel.points = newPoints ? newPoints.map((pt) => ({ ...pt })) : null;
				sel.bounds = newBounds ? { ...newBounds } : null;
				sel.composite = newComposite;
				sel.inverted = newInverted;
				sel.outlineLoops = newOutlineLoops ? newOutlineLoops.map((loop) => loop.map((pt) => ({ ...pt }))) : null;
				renderer.refreshActiveSelection();
				documentRegistry.notifyChange(doc);
			},
			dispose: () => {
				// Free the snapshot that is NOT the live one.
				if (sel.maskId === newMaskId && surfaces.has(oldMaskId)) {
					surfaces.dispose(oldMaskId);
				} else if (sel.maskId === oldMaskId && surfaces.has(newMaskId)) {
					surfaces.dispose(newMaskId);
				}
			}
		});
		return true;
	}

	private transformPoint(point: Point): Point {
		const cos = Math.cos(this.rotation);
		const sin = Math.sin(this.rotation);
		const x = (point.x - this.pivot.x) * this.scaleX;
		const y = (point.y - this.pivot.y) * this.scaleY;
		return {
			x: this.pivot.x + this.offset.x + x * cos - y * sin,
			y: this.pivot.y + this.offset.y + x * sin + y * cos
		};
	}

	/** Aborts the drag and restores the original selection state. */
	cancel(): void {
		if (!this.active) {
			this.reset();
			return;
		}
		const doc = this.doc;
		const renderer = this.renderer;
		const surfaces = renderer.surfaces;
		if (doc && this.origMaskId) {
			const sel = doc.selection;
			sel.maskId = this.origMaskId;
			sel.rect = this.origRect ? { ...this.origRect } : null;
			sel.points = this.origPoints ? this.origPoints.map((pt) => ({ ...pt })) : null;
			sel.bounds = this.origBounds ? { ...this.origBounds } : null;
			sel.composite = this.origComposite;
			sel.inverted = this.origInverted;
			sel.outlineLoops = this.origOutlineLoops ? this.origOutlineLoops.map((loop) => loop.map((pt) => ({ ...pt }))) : null;
			renderer.refreshActiveSelection();
			documentRegistry.notifyChange(doc);
		}
		if (this.newMaskId && surfaces.has(this.newMaskId)) surfaces.dispose(this.newMaskId);
		this.reset();
	}

	private reset(): void {
		this.doc = null;
		this.origMaskId = null;
		this.origRect = null;
		this.origPoints = null;
		this.origBounds = null;
		this.origOutlineLoops = null;
		this.origComposite = false;
		this.origInverted = false;
		this.origKind = 'rect';
		this.newMaskId = null;
		this.origin = null;
		this.offset = { x: 0, y: 0 };
		this.active = false;
	}
}
