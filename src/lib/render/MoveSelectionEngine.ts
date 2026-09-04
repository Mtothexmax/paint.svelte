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
import { boundsOfLoops } from './selection';

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

	// Mask surface produced by the most recent recreateMask(); becomes the
	// committed new mask on commit().
	private newMaskId: SurfaceId | null = null;

	// Drag state.
	private origin: Point | null = null;
	private offset: Point = { x: 0, y: 0 };
	private active = false;

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
		this.origBounds = sel.bounds ? { ...sel.bounds } : null;
		this.origOutlineLoops = sel.outlineLoops ? sel.outlineLoops.map((loop) => loop.map((pt) => ({ ...pt }))) : null;
		this.origComposite = sel.composite;
		this.origInverted = sel.inverted;
		this.newMaskId = null;
		this.origin = { x: Math.round(p.x), y: Math.round(p.y) };
		this.offset = { x: 0, y: 0 };
		this.active = true;
		return true;
	}

	/** Updates the selection mask to reflect the new drag offset. */
	moveTo(p: Point): void {
		if (!this.active || !this.doc || !this.origin) return;
		const dx = Math.round(p.x - this.origin.x);
		const dy = Math.round(p.y - this.origin.y);
		if (dx === this.offset.x && dy === this.offset.y) return;
		this.offset = { x: dx, y: dy };
		this.recreateMask();
	}

	/** Rebuilds the mask surface at the current offset and pushes the new
	 * geometry into the selection model. */
	private recreateMask(): void {
		if (!this.doc || !this.origMaskId) return;
		const renderer = this.renderer;
		const surfaces = renderer.surfaces;
		if (!surfaces.has(this.origMaskId)) return;
		const w = this.doc.width;
		const h = this.doc.height;
		const { x: dx, y: dy } = this.offset;

		// Build a fresh mask = original mask shifted by (dx, dy).
		const nextMaskId = surfaces.create(w, h);
		surfaces.blitRegion(this.origMaskId, nextMaskId, dx, dy, 'normal', 1);

		// Dispose the previous per-move mask; the original is left intact so
		// commit()/cancel() can roll back to it without re-deriving it.
		if (this.newMaskId && surfaces.has(this.newMaskId)) surfaces.dispose(this.newMaskId);
		this.newMaskId = nextMaskId;

		// Swap into the selection model so the visual (tint + ants + clip)
		// follows the drag instantly. `composite` / `inverted` flags are
		// preserved: the original mask is shifted, not re-derived.
		const sel = this.doc.selection;
		sel.maskId = nextMaskId;
		sel.rect = this.origRect
			? { x: this.origRect.x + dx, y: this.origRect.y + dy, width: this.origRect.width, height: this.origRect.height }
			: null;
		sel.points = this.origPoints ? this.origPoints.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) : null;
		sel.bounds = this.origBounds
			? { x: this.origBounds.x + dx, y: this.origBounds.y + dy, width: this.origBounds.width, height: this.origBounds.height }
			: null;
		sel.composite = this.origComposite;
		sel.inverted = this.origInverted;
		// Composite selections store outlineLoops as the truth for the ants;
		// re-derive them from the shifted mask so the ants follow the cursor.
		sel.outlineLoops = this.origComposite
			? renderer.computeMaskOutline(nextMaskId, w, h)
			: null;
		if (this.origComposite && sel.outlineLoops) {
			sel.bounds = boundsOfLoops(sel.outlineLoops) ?? sel.bounds;
		}

		renderer.refreshActiveSelection();
		documentRegistry.notifyChange(this.doc);
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
		if (dx === 0 && dy === 0) {
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

		// Snapshot the post-move state for the history entry.
		const newRect = sel.rect ? { ...sel.rect } : null;
		const newPoints = sel.points ? sel.points.map((pt) => ({ ...pt })) : null;
		const newBounds = sel.bounds ? { ...sel.bounds } : null;
		const newComposite = sel.composite;
		const newInverted = sel.inverted;
		const newOutlineLoops = sel.outlineLoops ? sel.outlineLoops.map((loop) => loop.map((pt) => ({ ...pt }))) : null;

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
		this.newMaskId = null;
		this.origin = null;
		this.offset = { x: 0, y: 0 };
		this.active = false;
	}
}
