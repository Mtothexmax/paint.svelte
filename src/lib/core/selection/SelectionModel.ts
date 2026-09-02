// Layer: core (framework-free). Centralized selection model — every tool goes
// through this one object per document (mandated: no per-tool selection logic).
// Geometry is informational (used to draw the ants outline / scope bounds);
// the mask SurfaceId is the enforcement point for painting/delete/effects.

import type { Point, Rect } from '../geometry';
import type { SurfaceId } from '../layers/Layer';

export type SelectionKind = 'rect' | 'ellipse' | 'lasso';

export interface SelectionModel {
	/** Whether a selection is currently in effect. */
	active: boolean;
	/** Which tool produced the current geometry. */
	kind: SelectionKind;
	/** Shape rect that produced the mask (rect/ellipse tools). Image px. */
	rect: Rect | null;
	/** Closed lasso polygon that produced the mask. Image px. */
	points: Point[] | null;
	/** Integer bounding box of the selection, clamped to the document. */
	bounds: Rect | null;
	/** Outline loops (image px) drawn as the ants when the selection is a
	 * composite (mask-derived) region without a single shape. Null otherwise. */
	outlineLoops: Point[][] | null;
	/** Doc-sized alpha mask surface handle (pixels owned by the render layer). */
	maskId: SurfaceId | null;
	/**
	 * True once the selection was built from multiple add/subtract operations,
	 * so it can no longer be described by one simple shape. The mask surface is
	 * then the ONLY source of truth (Delete/Invert fall back to it).
	 */
	composite: boolean;
	/**
	 * True when the mask is the COMPLEMENT of `rect`/`points` (produced by
	 * Invert Selection). The geometry fields still describe the pre-invert
	 * shape; the renderer uses this flag to draw the complement outline
	 * (document border ∪ shape border) while the mask stays the authority.
	 */
	inverted: boolean;
}

/** A fresh document starts with no selection and no mask surface. */
export function emptySelection(): SelectionModel {
	return {
		active: false,
		kind: 'rect',
		rect: null,
		points: null,
		bounds: null,
		outlineLoops: null,
		maskId: null,
		composite: false,
		inverted: false
	};
}
