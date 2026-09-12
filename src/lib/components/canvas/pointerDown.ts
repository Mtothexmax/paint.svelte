// Layer: components -> pointer-down routing. The canvas routes a pointer-down
// to exactly one tool/gesture (pan, zoom, selection, move, paint, ...). Pure
// over a caller-supplied API object; the armed-state checks are computed here
// from the active tool + open document instead of mirroring component flags.
import { get } from 'svelte/store';
import type { Point } from '../../core/geometry';
import { rgbaToHex, rgbaToHexA, type RGBA } from '../../core/color';
import { documentRegistry } from '../../core/document/registry';
import type { ImageDocument } from '../../core/document/ImageDocument';
import { getEditorRenderer } from '../../render/EditorRenderer';
import { zoomBy } from '../../render/Viewport';
import { logTransformDebug } from '../../render/transformDebug';
import { sampleCompositeColorAt } from '../../render/eyedropper';
import { MoveEngine } from '../../render/MoveEngine';
import type { TransformHandle } from '../../render/MoveEngine';
import { MoveSelectionEngine } from '../../render/MoveSelectionEngine';
import { cancelFloatingMove } from '../../state/moveTransform';
import { CloneEngine } from '../../render/CloneEngine';
import { RecolorEngine } from '../../render/RecolorEngine';
import { BrushEngine } from '../../render/BrushEngine';
import {
	activeToolId,
	antiAliasMode,
	backgroundColor,
	brushHardness,
	brushOpacity,
	brushSize,
	brushSpacing,
	foregroundColor,
	moveToolMode,
	selectionMode,
	showNotice
} from '../../state/ui';
import { cloneHardness, cloneOpacity, cloneSize } from '../../state/clone';
import { recolorHardness, recolorOpacity, recolorSize } from '../../state/recolor';
import { eyedropperCopyHex, eyedropperIncludeAlpha } from '../../state/eyedropper';
import { applyFill } from '../../services/fillService';
import { applyWandSelection } from '../../services/wandService';
import { deselect } from '../../services/selectionService';
import { convertTextToRaster } from '../../services/textService';
import { openDialog } from '../../services/dialogService';
import { isTextTarget } from './keyboard';
import { selectionToolKind, type PointerApi } from './pointerRelease';
import { EYEDROPPER, KIND, PAINT_TOOLS, SELECT_TOOLS } from './tools';

export interface ShapeDraftState {
	startX: number;
	startY: number;
	curX: number;
	curY: number;
	swap: boolean;
}
export interface LineDraftState {
	p0: Point;
	p1: Point;
	p2: Point;
	p3: Point;
	swap: boolean;
	drawing: boolean;
}
export interface GradientDraftState {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	swap: boolean;
	drawing: boolean;
}

export interface PointerDownApi extends PointerApi {
	// engine accessors widened to the full engine surface this router drives
	// (PointerApi narrows them to just what the release handlers need).
	cloneEngine(): CloneEngine | null;
	recolorEngine(): RecolorEngine | null;
	brushEngine(): BrushEngine | null;
	moveEngine(): MoveEngine | null;
	moveSelEngine(): MoveSelectionEngine | null;
	// reads
	spaceHeld(): boolean;
	textDraft(): boolean;
	getLastTransformClick(): { handle: TransformHandle | null; time: number };
	// writes
	setPanStart(v: Point): void;
	setPanStartView(v: { panX: number; panY: number }): void;
	setSelDownClient(v: Point): void;
	setDragMode(v: 'replace' | 'add' | 'subtract'): void;
	setTransformHandle(v: TransformHandle | null): void;
	setLastTransformClick(v: { handle: TransformHandle | null; time: number }): void;
	setShapeDraft(v: ShapeDraftState | null): void;
	setShapePointerId(v: number): void;
	setLineDraft(v: LineDraftState | null): void;
	setLinePointerId(v: number): void;
	setGradientDraft(v: GradientDraftState | null): void;
	setGradientPointerId(v: number): void;
	setCloneEngine(v: CloneEngine | null): void;
	setRecolorEngine(v: RecolorEngine | null): void;
	setBrushEngine(v: BrushEngine | null): void;
	setMoveEngine(v: MoveEngine | null): void;
	setMoveSelEngine(v: MoveSelectionEngine | null): void;
	// conversions / capture
	toScreen(e: { clientX: number; clientY: number }): Point;
	capture(e: PointerEvent): void;
	// actions delegated to the host
	movePointer(sp: Point): void;
	updateStatus(doc?: ImageDocument, cursor?: Point): void;
	refreshRing(): void;
	commitTextDraft(): void;
	openTextDraft(e: PointerEvent): void;
	polyClick(e: PointerEvent): void;
	transformHandleAt(img: Point): TransformHandle | null;
	beginTransformDrag(e: PointerEvent, img: Point, handle: TransformHandle): void;
	resetPivotToCenter(): void;
	startMoveDrag(e: PointerEvent, img: Point): void;
	lineNubPoint(i: number): Point;
	gradientEndPoint(i: number): Point;
	finishLineDraft(): void;
	finishGradientDraft(): void;
}

export function handlePointerDown(e: PointerEvent, a: PointerDownApi): void {
	if (!a.ready()) return;
	// Clicks inside the text-draft editor belong to the textarea.
	if (isTextTarget(e.target)) return;
	a.movePointer(a.toScreen(e));
	const tool = get(activeToolId);
	const hasDoc = !!documentRegistry.active;
	const wantsPan = e.button === 1 || (e.button === 0 && (a.spaceHeld() || (tool === 'pan' && hasDoc)));
	if (wantsPan) {
		// Panning would orphan the text-draft overlay — commit it first.
		if (a.textDraft()) void a.commitTextDraft();
		if (a.shapeDraft()) a.cancelShapeDraft();
		if (a.lineDraft()) a.cancelLineDraft();
		if (a.gradientDraft()) a.cancelGradientDraft();
		e.preventDefault();
		const doc = documentRegistry.active;
		if (!doc) return;
		a.setPanning(true);
		a.setPanPointerId(e.pointerId);
		a.setPanStart({ x: e.clientX, y: e.clientY });
		a.setPanStartView({ panX: doc.view.panX, panY: doc.view.panY });
		a.capture(e);
		return;
	}
	// Zoom tool: left click zooms in (×1.5), right click zooms out (÷1.5),
	// anchored at the pointer so the image pixel under the cursor stays put.
	if (tool === 'zoom' && hasDoc && (e.button === 0 || e.button === 2)) {
		e.preventDefault();
		if (e.button === 2) a.setZoomRightHeld(true);
		const doc = documentRegistry.active;
		if (!doc || !a.ready()) return;
		const anchor = a.toScreen(e);
		const factor = e.button === 0 ? 1.5 : 1 / 1.5;
		doc.view = zoomBy(doc.view, anchor, factor);
		getEditorRenderer().refreshActiveView();
		a.syncTransformUi();
		a.updateStatus(doc);
		a.refreshRing();
		return;
	}
	// Text tool: a click places the editing nub (committing any open draft
	// first, Paint.NET behaviour). Space-pan and the zoom tool above still
	// take precedence. The draft's own drag nub is handled separately.
	if (tool === 'text' && (e.button === 0 || e.button === 2)) {
		if (e.target instanceof HTMLElement && e.target.closest('.text-nub')) return;
		e.preventDefault();
		a.openTextDraft(e);
		return;
	}
	// Polygon lasso: clicks place vertices (left = chosen mode with
	// Ctrl/Shift = add, Alt = subtract; right button always subtracts);
	// a double-click finishes the polygon.
	if ((e.button === 0 || e.button === 2) && SELECT_TOOLS.has(tool) && hasDoc && tool === 'select-poly') {
		e.preventDefault();
		a.polyClick(e);
		return;
	}
	// Selection tools: a LEFT drag selects with the chosen mode (Ctrl or
	// Shift = add, Alt = subtract, else the options-strip mode); a RIGHT-button
	// drag always subtracts. The draft outline is shown live and committed on
	// pointer-up.
	if ((e.button === 0 || e.button === 2) && SELECT_TOOLS.has(tool) && hasDoc && selectionToolKind()) {
		// A new marquee replaces the selection — a floating transform cannot
		// survive that (reset rule: only Apply keeps it).
		cancelFloatingMove();
		a.setDragMode(e.button === 2 || e.altKey ? 'subtract' : e.ctrlKey || e.shiftKey ? 'add' : get(selectionMode));
		console.log('[editor] pointerdown: selection tool', tool, 'kind', selectionToolKind(), 'mode', get(selectionMode));
		e.preventDefault();
		a.setSelecting(true);
		a.setSelectPointerId(e.pointerId);
		a.setSelDownClient({ x: e.clientX, y: e.clientY });
		a.setSelStart(clampImage(a.toImage(e)));
		a.setLassoPts([a.selStart()!]);
		a.capture(e);
		getEditorRenderer().previewSelectionOutline(null, false);
		return;
	}
	// Move tool, Paint.NET style: the FIRST press inside the selection lifts
	// the content into a floating preview; further presses inside re-drag it; a
	// press OUTSIDE the selection drops (applies) it and is consumed.
	if (e.button === 0 && tool === 'move-pixels' && hasDoc) {
		e.preventDefault();
		const img = a.toImage(e);
		let moveEngine = a.moveEngine();
		if (!moveEngine) {
			moveEngine = new MoveEngine(getEditorRenderer());
			moveEngine.setMode(get(moveToolMode));
			a.setMoveEngine(moveEngine);
		}
		// Refresh the handle geometry before hit-testing. The engine is
		// authoritative while a floating selection is being transformed.
		a.syncTransformUi();
		const handle = a.transformHandleAt(img);
		logTransformDebug('canvas.pointerdown', {
			pointer: img,
			handle,
			floating: moveEngine.floating,
			transform: moveEngine.transformState
		});
		const now = performance.now();
		if (handle === 'pivot' && a.getLastTransformClick().handle === 'pivot' && now - a.getLastTransformClick().time < 400) {
			a.resetPivotToCenter();
			a.setLastTransformClick({ handle: null, time: 0 });
			return;
		}
		a.setLastTransformClick({ handle, time: now });
		if (moveEngine.floating) {
			if (handle) a.beginTransformDrag(e, img, handle);
			else if (moveEngine.pointInSelection(img)) a.startMoveDrag(e, img);
			else moveEngine.drop();
			return;
		}
		const mdoc = documentRegistry.active;
		if (!mdoc) return;
		if (!mdoc.selection.active) {
			showNotice('Draw a selection first.');
			return;
		}
		if (moveEngine.begin() === 'ok') {
			const activeHandle = handle ?? 'move';
			if (activeHandle === 'move' && !moveEngine.pointInSelection(img)) {
				moveEngine.cancel();
			} else a.beginTransformDrag(e, img, activeHandle);
		}
		return;
	}
	// Move-Selection tool: drags the SELECTION (mask + outline), NOT the
	// pixels. Click outside a live selection drops the selection (Paint.NET
	// behaviour). Click inside arms a drag — release commits the move.
	if (e.button === 0 && tool === 'move-selection' && hasDoc) {
		e.preventDefault();
		const doc = documentRegistry.active;
		if (!doc) return;
		if (!doc.selection.active) {
			showNotice('Draw a selection first.');
			return;
		}
		if (!a.moveSelEngine()) a.setMoveSelEngine(new MoveSelectionEngine(getEditorRenderer()));
		const moveSelEngine = a.moveSelEngine()!;
		const img = a.toImage(e);
		// A pixels float cannot survive a selection drag — reset it first.
		cancelFloatingMove();
		if (moveSelEngine.begin(img)) {
			a.syncTransformUi();
			const handle = a.transformHandleAt(img);
			logTransformDebug('canvas.selectionPointerdown', {
				pointer: img,
				handle,
				transform: moveSelEngine.transformState
			});
			a.setTransformHandle(handle);
			if (handle) moveSelEngine.beginTransform(handle, img);
			a.setMovingSelection(true);
			a.setMoveSelPointerId(e.pointerId);
			a.capture(e);
		} else {
			// No usable selection (e.g. mask surface is missing): drop it.
			deselect();
		}
		return;
	}
	// Any other tool/action first drops a floating selection (Paint.NET
	// behaviour): the content is stamped at its current position.
	if (a.moveEngine()?.floating) a.moveEngine()!.drop();
	// Paint with the LEFT button in the foreground colour and with the RIGHT
	// button in the background colour (Paint.NET behaviour). Right-button
	// painting also suppresses the context menu (preventDefault + the
	// App-level oncontextmenu guard), so it never interrupts a stroke.
	if (tool === EYEDROPPER) {
		// Eyedropper stays active (Paint.NET behaviour): left click samples
		// into the foreground slot, right click into the background slot.
		if (e.button !== 0 && e.button !== 2) return;
		e.preventDefault();
		const img = a.toImage(e);
		const doc = documentRegistry.active;
		if (!doc || img.x < 0 || img.y < 0 || img.x >= doc.width || img.y >= doc.height) {
			showNotice('Outside canvas.');
			return;
		}
		const sampled = sampleCompositeColorAt(getEditorRenderer(), doc, img.x, img.y);
		if (!sampled) {
			showNotice('Could not sample colour.', 'error');
			return;
		}
		// Hex carries the alpha byte only when the eyedropper's include-alpha
		// toggle is on (#RRGGBBAA vs #RRGGBB).
		const hexOf = (c: RGBA) =>
			get(eyedropperIncludeAlpha) ? rgbaToHexA(c) : rgbaToHex(c);
		if (e.button === 2) {
			backgroundColor.set(sampled);
			showNotice(`Background ${hexOf(sampled)}`);
		} else {
			foregroundColor.set(sampled);
			showNotice(`Foreground ${hexOf(sampled)}`);
		}
		if (get(eyedropperCopyHex)) {
			const hex = hexOf(sampled);
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				navigator.clipboard
					.writeText(hex)
					.catch(() => showNotice('Could not copy to clipboard.', 'error'));
			}
		}
		return;
	}
	// Paint bucket: left click fills with the foreground colour, right click
	// with the background colour (Paint.NET behaviour). The tool stays active;
	// tolerance + contiguous/global come from the options strip.
	if (tool === 'bucket' && (e.button === 0 || e.button === 2)) {
		e.preventDefault();
		const img = a.toImage(e);
		const result = applyFill(img.x, img.y, e.button === 2 ? get(backgroundColor) : get(foregroundColor));
		if (result === 'out-of-bounds') showNotice('Outside canvas.');
		else if (result === 'outside-selection') showNotice('Outside the selection.', 'error');
		else if (result === 'transparent') showNotice('Fill colour is fully transparent.', 'error');
		else if (result === 'failed') showNotice('Nothing to fill.', 'error');
		return;
	}
	// Magic wand: same flood region as the bucket (tolerance + contiguous/global
	// from the options strip), committed as a selection. Modifier behaviour
	// mirrors the other selection tools (Ctrl/Shift = add, Alt = subtract, right
	// button always subtracts).
	if (tool === 'wand' && (e.button === 0 || e.button === 2)) {
		e.preventDefault();
		const img = a.toImage(e);
		const selMode = e.button === 2 || e.altKey ? 'subtract' : e.ctrlKey || e.shiftKey ? 'add' : get(selectionMode);
		const result = applyWandSelection(img.x, img.y, selMode);
		if (result === 'out-of-bounds') showNotice('Outside canvas.');
		else if (result === 'empty') showNotice('No matching pixels.', 'error');
		else if (result === 'no-selection') showNotice('Nothing to subtract from.', 'error');
		else if (result === 'failed') showNotice('Could not select.', 'error');
		return;
	}
	// Shapes tool: drag defines the bounding box (any direction); release
	// rasterises. Right-button drag swaps outline/fill colours.
	if (tool === 'shape' && (e.button === 0 || e.button === 2)) {
		e.preventDefault();
		const img = a.toImage(e);
		a.setShapeDraft({ startX: img.x, startY: img.y, curX: img.x, curY: img.y, swap: e.button === 2 });
		a.setShapePointerId(e.pointerId);
		a.capture(e);
		return;
	}
	// Line tool: a drag draws straight (controls follow); release keeps 4
	// editable nubs. A click elsewhere commits the open line first.
	if (tool === 'line' && (e.button === 0 || e.button === 2)) {
		if (e.target instanceof HTMLElement && e.target.closest('.line-nub')) return;
		e.preventDefault();
		const doc = documentRegistry.active;
		if (!doc) return;
		const sp = a.toScreen(e);
		// Forgiving grab: landing near a nub drags it instead of committing +
		// restarting (easy to miss the 1xpx nub).
		if (a.lineDraft() && !a.lineDrawing()) {
			const pts = [0, 1, 2, 3].map((i) => a.lineNubPoint(i));
			let best = -1;
			let bestDist = 14;
			for (let idx = 0; idx < pts.length; idx++) {
				const d = Math.hypot(sp.x - pts[idx].x, sp.y - pts[idx].y);
				if (d <= bestDist) {
					bestDist = d;
					best = idx;
				}
			}
			if (best >= 0) {
				a.setLineNubDrag(best as 0 | 1 | 2 | 3);
				a.setLinePointerId(e.pointerId);
				a.capture(e);
				console.info('[line]', `grab nub ${best} near canvas`);
				return;
			}
		}
		if (a.lineDraft()) a.finishLineDraft();
		const img = a.toImage(e);
		const pt = { x: img.x, y: img.y };
		a.setLineDraft({ p0: pt, p1: { ...pt }, p2: { ...pt }, p3: { ...pt }, swap: e.button === 2, drawing: true });
		a.setLinePointerId(e.pointerId);
		a.capture(e);
		return;
	}
	// Clone stamp: Alt+click sets the source anchor, otherwise a stroke stamps
	// the source with an aligned offset.
	if (tool === 'clone-stamp' && (e.button === 0 || e.button === 2)) {
		e.preventDefault();
		if (!a.cloneEngine()) a.setCloneEngine(new CloneEngine(getEditorRenderer()));
		const cloneEngine = a.cloneEngine()!;
		const img = a.toImage(e);
		if (e.altKey) {
			cloneEngine.setSource(img);
			showNotice('Clone source set.');
			return;
		}
		const started = cloneEngine.begin(
			{
				size: get(cloneSize),
				opacity: get(cloneOpacity) / 100,
				hardness: get(cloneHardness) / 100,
				spacingRatio: get(brushSpacing) / 100
			},
			img
		);
		if (started === 'no-source') {
			showNotice('Alt+click to set the clone source.', 'error');
			return;
		}
		if (started === 'none') return;
		a.setCloning(true);
		a.setClonePointerId(e.pointerId);
		a.capture(e);
		return;
	}
	// Recolor brush: paints the foreground colour, destination alpha kept.
	if (tool === 'recolor' && (e.button === 0 || e.button === 2)) {
		e.preventDefault();
		if (!a.recolorEngine()) a.setRecolorEngine(new RecolorEngine(getEditorRenderer()));
		const recolorEngine = a.recolorEngine()!;
		const img = a.toImage(e);
		const started = recolorEngine.begin(
			{
				size: get(recolorSize),
				opacity: get(recolorOpacity) / 100,
				hardness: get(recolorHardness) / 100,
				spacingRatio: get(brushSpacing) / 100,
				color: get(foregroundColor)
			},
			img
		);
		if (!started) return;
		a.setRecoloring(true);
		a.setRecolorPointerId(e.pointerId);
		a.capture(e);
		return;
	}
	// Gradient tool: a drag draws the gradient line; release keeps 2 draggable
	// end nubs (the line itself is not drawn). A click elsewhere commits the
	// open gradient first.
	if (tool === 'gradient' && (e.button === 0 || e.button === 2)) {
		if (e.target instanceof HTMLElement && e.target.closest('.gradient-nub')) return;
		e.preventDefault();
		const doc = documentRegistry.active;
		if (!doc) return;
		const sp = a.toScreen(e);
		// Forgiving grab: landing near an end drags it instead of committing +
		// restarting (easy to miss the 1xpx nub).
		if (a.gradientDraft() && !a.gradientDrawing()) {
			const p0 = a.gradientEndPoint(0);
			const p1 = a.gradientEndPoint(1);
			const d0 = Math.hypot(sp.x - p0.x, sp.y - p0.y);
			const d1 = Math.hypot(sp.x - p1.x, sp.y - p1.y);
			if (Math.min(d0, d1) <= 14) {
				a.setGradientNubDrag(d0 <= d1 ? 0 : 1);
				a.setGradientPointerId(e.pointerId);
				a.capture(e);
				console.info('[gradient]', `grab end ${d0 <= d1 ? 0 : 1} near canvas`);
				return;
			}
		}
		if (a.gradientDraft()) a.finishGradientDraft();
		const img = a.toImage(e);
		a.setGradientDraft({ x0: img.x, y0: img.y, x1: img.x, y1: img.y, swap: e.button === 2, drawing: true });
		a.setGradientPointerId(e.pointerId);
		a.capture(e);
		return;
	}
	if ((e.button === 0 || e.button === 2) && PAINT_TOOLS.has(tool) && hasDoc) {
		e.preventDefault();
		const paintDoc = documentRegistry.active;
		const activeLayer = paintDoc?.layers.find((l) => l.id === paintDoc.activeLayerId);
		if (activeLayer?.kind === 'text') {
			// Text layers only accept paint once they are rasterised. Ask first
			// (the confirmation resumes this exact stroke afterwards).
			openDialog('rasterizeConfirm', {
				onConfirm: () => {
					convertTextToRaster(activeLayer.id);
					startPaintStroke(a, e, tool);
				}
			});
			return;
		}
		startPaintStroke(a, e, tool);
	}
}

function startPaintStroke(a: PointerDownApi, e: PointerEvent, tool: string): void {
	a.setPainting(true);
	a.setPaintPointerId(e.pointerId);
	a.capture(e);
	if (!a.brushEngine()) a.setBrushEngine(new BrushEngine(getEditorRenderer()));
	const engine = a.brushEngine()!;
	const img = a.toImage(e);
	const isPencilStroke = tool === 'pencil';
	const kind = KIND[tool] ?? 'brush';
	const color = e.button === 2 ? get(backgroundColor) : get(foregroundColor);
	engine.begin(
		isPencilStroke
			? {
					kind: 'pencil',
					size: 1,
					opacity: 1,
					hardness: 1,
					spacingRatio: 0,
					antiAlias: false,
					color
				}
			: {
					kind,
					size: get(brushSize),
					opacity: get(brushOpacity) / 100,
					hardness: get(brushHardness) / 100,
					spacingRatio: get(brushSpacing) / 100,
					antiAlias: get(antiAliasMode) === 'smooth',
					color
				},
		img
	);
}

function clampImage(p: Point): Point {
	const doc = documentRegistry.active;
	if (!doc) return p;
	return {
		x: Math.max(0, Math.min(doc.width, p.x)),
		y: Math.max(0, Math.min(doc.height, p.y))
	};
}