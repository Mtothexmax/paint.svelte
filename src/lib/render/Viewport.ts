// Layer: render (pure math — no pixi symbols needed here).
// Screen<->image mapping and anchored zoom math from plan §6.2.

import { clamp, type Point } from '../core/geometry';
import { ZOOM_MAX, ZOOM_MIN } from '../core/limits';
import type { ViewState } from '../core/document/ImageDocument';

/** screen = pan + image * zoom */
export function imageToScreen(v: ViewState, ix: number, iy: number): Point {
	return { x: v.panX + ix * v.zoom, y: v.panY + iy * v.zoom };
}

/** image = (screen - pan) / zoom */
export function screenToImage(v: ViewState, sx: number, sy: number): Point {
	return { x: (sx - v.panX) / v.zoom, y: (sy - v.panY) / v.zoom };
}

/**
 * Anchor zoom: keep the image pixel under the screen-space anchor `m` fixed.
 * pan' = m - (m - pan) * (z' / z)
 */
export function zoomTo(v: ViewState, anchor: Point, targetZoom: number): ViewState {
	const zoom = clamp(targetZoom, ZOOM_MIN, ZOOM_MAX);
	const ratio = zoom / (v.zoom || 1);
	return {
		zoom,
		panX: anchor.x - (anchor.x - v.panX) * ratio,
		panY: anchor.y - (anchor.y - v.panY) * ratio
	};
}

/** Multiplicative zoom step anchored at `anchor` (used by the wheel). */
export function zoomBy(v: ViewState, anchor: Point, factor: number): ViewState {
	return zoomTo(v, anchor, (v.zoom || 1) * factor);
}

/**
 * Compute a view that centers the document inside the viewport (fit-to-window).
 * Returns a new view state (pan already applied to center).
 */
export function fitView(
	docWidth: number,
	docHeight: number,
	viewportWidth: number,
	viewportHeight: number
): ViewState {
	if (viewportWidth <= 0 || viewportHeight <= 0 || docWidth <= 0 || docHeight <= 0) {
		return { zoom: 1, panX: 0, panY: 0 };
	}
	const zoom = clamp(Math.min(viewportWidth / docWidth, viewportHeight / docHeight), ZOOM_MIN, ZOOM_MAX);
	return {
		zoom,
		panX: (viewportWidth - docWidth * zoom) / 2,
		panY: (viewportHeight - docHeight * zoom) / 2
	};
}
