// Layer: components -> pointer-release / selection-commit logic for the canvas.
// Pure functions over a caller-supplied API object (the component provides
// closures over its reactive state). The pieces of state these handlers mutate
// are passed through get/set closures; engines expose their methods directly.
import { get } from 'svelte/store';
import type { Point, Rect } from '../../core/geometry';
import { documentRegistry } from '../../core/document/registry';
import { getEditorRenderer } from '../../render/EditorRenderer';
import { logTransformDebug } from '../../render/transformDebug';
import { activeToolId, selectionRatio, selectionFixedRatio, selectionFixedSize, statusBar } from '../../state/ui';
import { applySelectionMode, applySelectionRect } from '../../services/selectionService';
import { SELECT_DRAG_MIN, SELECT_KIND } from './tools';

/** Selection kind of the active selection tool (null for other tools). */
export function selectionToolKind(): 'rect' | 'ellipse' | 'lasso' | null {
	const kind = SELECT_KIND[get(activeToolId)];
	return kind ?? null;
}

export function clampSelectionPoint(point: Point): Point {
	const doc = documentRegistry.active;
	if (!doc) return point;
	return {
		x: Math.max(0, Math.min(doc.width, point.x)),
		y: Math.max(0, Math.min(doc.height, point.y))
	};
}

/** Returns the opposite (drag) corner for the RECTANGLE tool according to the
 * selected Ratio mode: free (pass-through), fixed aspect ratio, or a fixed
 * size. `start` is the anchor point, `cur` the raw pointer position. */
export function constrainRectCorner(start: Point, cur: Point): Point {
	const mode = get(selectionRatio);
	if (mode === 'normal') return cur;
	const dirX = cur.x >= start.x ? 1 : -1;
	const dirY = cur.y >= start.y ? 1 : -1;
	if (mode === 'fixedSize') {
		const s = get(selectionFixedSize);
		return {
			x: start.x + dirX * Math.max(1, s.width),
			y: start.y + dirY * Math.max(1, s.height)
		};
	}
	// fixed ratio
	const r = get(selectionFixedRatio);
	const ratio = r.height > 0 ? r.width / r.height : 1;
	let w = Math.max(1, Math.abs(cur.x - start.x));
	let h = Math.max(1, Math.abs(cur.y - start.y));
	if (w / h > ratio) w = h * ratio;
	else h = w / ratio;
	return { x: start.x + dirX * Math.max(1, Math.round(w)), y: start.y + dirY * Math.max(1, Math.round(h)) };
}

/** The free-floating Fixed-Size rectangle whose top-left follows the pointer. */
export function fixedRectAt(cur: Point): Rect {
	const s = get(selectionFixedSize);
	return { x: Math.round(cur.x), y: Math.round(cur.y), width: Math.max(1, s.width), height: Math.max(1, s.height) };
}

/** Engine accessors exercised by the release handlers. */
export interface ReleaseEngines {
	cloneEngine(): { finish(): void; cancel(): void } | null;
	recolorEngine(): { finish(): void; cancel(): void } | null;
	brushEngine(): { finish(): void; cancel(): void } | null;
	moveEngine(): {
		floating: boolean;
		cancel(): void;
		drop(): void;
		transformState: unknown;
	} | null;
	moveSelEngine(): { dragging: boolean; cancel(): void; commit(): void } | null;
}

export interface PointerApi extends ReleaseEngines {
	// gesture flags + pointer ids (get/set pairs)
	zoomRightHeld(): boolean;
	setZoomRightHeld(v: boolean): void;
	cloning(): boolean;
	setCloning(v: boolean): void;
	clonePointerId(): number;
	setClonePointerId(v: number): void;
	recoloring(): boolean;
	setRecoloring(v: boolean): void;
	recolorPointerId(): number;
	setRecolorPointerId(v: number): void;
	lineDraft(): boolean;
	lineDrawing(): boolean;
	setLineDrawing(v: boolean): void;
	linePointerId(): number;
	lineNubDrag(): 0 | 1 | 2 | 3 | null;
	setLineNubDrag(v: 0 | 1 | 2 | 3 | null): void;
	gradientDraft(): boolean;
	gradientDrawing(): boolean;
	setGradientDrawing(v: boolean): void;
	gradientPointerId(): number;
	gradientNubDrag(): 0 | 1 | null;
	setGradientNubDrag(v: 0 | 1 | null): void;
	shapeDraft(): boolean;
	shapePointerId(): number;
	painting(): boolean;
	setPainting(v: boolean): void;
	paintPointerId(): number;
	setPaintPointerId(v: number): void;
	moving(): boolean;
	setMoving(v: boolean): void;
	movePointerId(): number;
	setMovePointerId(v: number): void;
	movingSelection(): boolean;
	setMovingSelection(v: boolean): void;
	moveSelPointerId(): number;
	setMoveSelPointerId(v: number): void;
	clearTransformHandle(): void;
	panning(): boolean;
	setPanning(v: boolean): void;
	panPointerId(): number;
	setPanPointerId(v: number): void;
	selecting(): boolean;
	setSelecting(v: boolean): void;
	selectPointerId(): number;
	setSelectPointerId(v: number): void;
	selStart(): Point | null;
	setSelStart(v: Point | null): void;
	lassoPts(): Point[];
	setLassoPts(v: Point[]): void;
	selDownClient(): Point;
	dragMode(): 'replace' | 'add' | 'subtract';
	ready(): boolean;
	// conversion / capture / actions
	toImage(e: PointerEvent): Point;
	release(pointerId: number): void;
	finishShapeDraft(): void;
	cancelShapeDraft(): void;
	cancelLineDraft(): void;
	cancelGradientDraft(): void;
	cancelSelectDrag(): void;
	syncTransformUi(): void;
}

/** Commits the selection drag (mask fill + model update) when it was a real
 * drag and not a plain click. */
export function commitSelect(e: PointerEvent, a: PointerApi): void {
	const doc = documentRegistry.active;
	const kind = selectionToolKind();
	const start = a.selStart();
	a.setSelecting(false);
	a.setSelectPointerId(-1);
	a.setSelStart(null);
	statusBar.update((s) => ({ ...s, selW: null, selH: null }));
	if (!doc || !kind || !start) {
		a.setLassoPts([]);
		if (a.ready()) getEditorRenderer().refreshActiveSelection();
		return;
	}
	const upRaw = clampSelectionPoint(a.toImage(e));
	const up =
		kind === 'rect' && get(selectionRatio) !== 'fixedSize' ? constrainRectCorner(start, upRaw) : upRaw;
	if (kind === 'rect' && get(selectionRatio) === 'fixedSize') {
		// Fixed Size: freely place the fixed box at the release point.
		applySelectionRect(a.dragMode(), 'rect', fixedRectAt(upRaw));
	} else if (kind === 'lasso') {
		const pts = a.lassoPts();
		const last = pts[pts.length - 1];
		if (!last || Math.hypot(upRaw.x - last.x, upRaw.y - last.y) >= 1) pts.push(upRaw);
		if (pts.length >= 2) applySelectionMode(a.dragMode(), 'lasso', start, start, pts);
	} else if (Math.hypot(e.clientX - a.selDownClient().x, e.clientY - a.selDownClient().y) >= SELECT_DRAG_MIN) {
		applySelectionMode(a.dragMode(), kind, start, up, []);
	}
	a.setLassoPts([]);
	// The draft wiped the committed ants — redraw whatever the model now says.
	if (a.ready()) getEditorRenderer().refreshActiveSelection();
}

export function handleEndPointer(e: PointerEvent, a: PointerApi): void {
	a.setZoomRightHeld(false);
	if (a.cloning() && e.pointerId === a.clonePointerId()) {
		a.cloneEngine()?.finish();
		a.setCloning(false);
		a.setClonePointerId(-1);
		a.release(e.pointerId);
	}
	if (a.recoloring() && e.pointerId === a.recolorPointerId()) {
		a.recolorEngine()?.finish();
		a.setRecoloring(false);
		a.setRecolorPointerId(-1);
		a.release(e.pointerId);
	}
	// Release of the initial line drag arms the 4 nubs (no commit yet).
	// Nub releases bubble here too but drawing is already false then.
	if (a.lineDraft() && a.lineDrawing() && e.pointerId === a.linePointerId()) {
		a.setLineDrawing(false);
		a.release(e.pointerId);
	}
	if (a.lineDraft() && a.lineNubDrag() !== null && e.pointerId === a.linePointerId()) {
		a.setLineNubDrag(null);
	}
	// Same for the gradient line (only its 2 end nubs stay).
	if (a.gradientDraft() && a.gradientDrawing() && e.pointerId === a.gradientPointerId()) {
		a.setGradientDrawing(false);
		a.release(e.pointerId);
	}
	if (a.gradientDraft() && a.gradientNubDrag() !== null && e.pointerId === a.gradientPointerId()) {
		a.setGradientNubDrag(null);
	}
	if (a.shapeDraft() && e.pointerId === a.shapePointerId()) {
		a.finishShapeDraft();
		a.release(e.pointerId);
	}
	if (a.painting() && e.pointerId === a.paintPointerId()) {
		a.brushEngine()?.finish();
		a.setPainting(false);
		a.setPaintPointerId(-1);
		a.release(e.pointerId);
	}
	if (a.moving() && e.pointerId === a.movePointerId()) {
		// release only ends the drag — the floating selection stays floating
		// until it is dropped (click outside / Enter / tool switch)
		a.setMoving(false);
		a.setMovePointerId(-1);
		a.clearTransformHandle();
		a.release(e.pointerId);
		a.syncTransformUi();
		logTransformDebug('canvas.pointerup', { transform: a.moveEngine()?.transformState });
	}
	if (a.movingSelection() && e.pointerId === a.moveSelPointerId()) {
		// pointer-up commits the move as a single history entry (no-op when
		// the user clicked without dragging)
		a.moveSelEngine()?.commit();
		a.setMovingSelection(false);
		a.setMoveSelPointerId(-1);
		a.clearTransformHandle();
		a.release(e.pointerId);
	}
	if (a.panning() && e.pointerId === a.panPointerId()) {
		a.setPanning(false);
		a.setPanPointerId(-1);
		a.release(e.pointerId);
	}
	if (a.selecting() && e.pointerId === a.selectPointerId()) {
		commitSelect(e, a);
		a.release(e.pointerId);
	}
}

export function handleCancelPointer(e: PointerEvent, a: PointerApi): void {
	a.setZoomRightHeld(false);
	if (a.cloning() && e.pointerId === a.clonePointerId()) {
		a.cloneEngine()?.cancel();
		a.setCloning(false);
		a.setClonePointerId(-1);
	}
	if (a.recoloring() && e.pointerId === a.recolorPointerId()) {
		a.recolorEngine()?.cancel();
		a.setRecoloring(false);
		a.setRecolorPointerId(-1);
	}
	if (a.lineDraft() && a.lineDrawing() && e.pointerId === a.linePointerId()) {
		a.cancelLineDraft();
	}
	if (e.pointerId === a.linePointerId()) a.setLineNubDrag(null);
	if (a.gradientDraft() && a.gradientDrawing() && e.pointerId === a.gradientPointerId()) {
		a.cancelGradientDraft();
	}
	if (e.pointerId === a.gradientPointerId()) a.setGradientNubDrag(null);
	if (a.shapeDraft() && e.pointerId === a.shapePointerId()) {
		a.cancelShapeDraft();
	}
	if (a.painting() && e.pointerId === a.paintPointerId()) {
		a.brushEngine()?.cancel();
		a.setPainting(false);
		a.setPaintPointerId(-1);
	}
	if (a.moving() && e.pointerId === a.movePointerId()) {
		// interrupted drag: keep the floating selection where it was
		a.setMoving(false);
		a.setMovePointerId(-1);
	}
	if (a.movingSelection() && e.pointerId === a.moveSelPointerId()) {
		// interrupted drag: keep the new selection position (mirrors MoveEngine
		// behaviour; the user can still drop via click-outside / Enter)
		a.setMovingSelection(false);
		a.setMoveSelPointerId(-1);
	}
	if (a.selecting() && e.pointerId === a.selectPointerId()) {
		a.cancelSelectDrag();
	}
	if (a.panning() && e.pointerId === a.panPointerId()) {
		a.setPanning(false);
		a.setPanPointerId(-1);
	}
}