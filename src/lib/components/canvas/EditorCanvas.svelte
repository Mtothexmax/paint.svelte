<script lang="ts">
	// Layer: components -> hosts <canvas>, routes pointers to viewport pan/zoom and
	// to the active paint tool. No pixi symbols imported here.
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { documentRegistry, RegistryEvents } from '../../core/document/registry';
	import type { Point } from '../../core/geometry';
	import { screenToImage, zoomBy } from '../../render/Viewport';
	import { getEditorRenderer, initEditorRenderer } from '../../render/EditorRenderer';
	import { BrushEngine } from '../../render/BrushEngine';
	import { MoveEngine } from '../../render/MoveEngine';
	import { MoveSelectionEngine } from '../../render/MoveSelectionEngine';
	import type { TransformHandle } from '../../render/MoveEngine';
	import { logTransformDebug } from '../../render/transformDebug';
	import { selectionOutlinePoints } from '../../render/selection';
	import { openFiles } from '../../services/fileService';
	import {
		copySelection,
		cutSelection,
		hasClipboardImage,
		pasteAsNewLayer,
		pasteBitmapAsLayer
	} from '../../services/clipboardService';
	import { dialog } from '../../services/dialogService';
	import { commands } from '../../services/commandRegistry';
	import {
		deleteSelection,
		deselect,
		fillSelection,
		invertSelection,
		selectAll,
	applySelectionMode,
	applySelectionRect
} from '../../services/selectionService';
	import {
		activeToolId,
		statusBar,
		brushSize,
		brushOpacity,
		brushHardness,
		brushSpacing,
		foregroundColor,
		backgroundColor,
		antiAliasMode,
		selectionMode,
		selectionRatio,
		selectionFixedRatio,
		selectionFixedSize,
		showNotice
	} from '../../state/ui';
	import { polygonAction } from '../../state/polygon';

	const PAINT_TOOLS = new Set(['brush', 'pencil', 'eraser']);
	const KIND: Record<string, 'brush' | 'pencil' | 'eraser'> = {
		brush: 'brush',
		pencil: 'pencil',
		eraser: 'eraser'
	};
	const SELECT_TOOLS = new Set(['select-rect', 'select-ellipse', 'lasso', 'select-poly']);
	const SELECT_KIND: Record<string, 'rect' | 'ellipse' | 'lasso'> = {
		'select-rect': 'rect',
		'select-ellipse': 'ellipse',
		lasso: 'lasso'
	};
	/** Polygon-lasso tool (click to place vertices). */
	const isPolyTool = () => get(activeToolId) === 'select-poly';
	/** Minimum pointer travel (screen px) before a selection drag commits. */
	const SELECT_DRAG_MIN = 3;
	// debug: last tool id that was logged (avoid console spam)
	let lastLoggedTool: string | null = null;

	let host: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;
	let ready = false;

	let spaceHeld = false;
	let panning = $state(false);
	let panPointerId = -1;
	let panStart = { x: 0, y: 0 };
	let panStartView = { panX: 0, panY: 0 };

	// painting state
	let engine: BrushEngine | null = null;
	let painting = $state(false);
	let paintPointerId = -1;

	// move-tool state (drag the selection content; commits on pointer-up)
	let moveEngine: MoveEngine | null = null;
	let moveArmed = $state(false);
	let moveToolSelected = $state(false);
	let moving = $state(false);
	let movePointerId = -1;
	let transformHandle: TransformHandle | null = null;
	let lastTransformClick = { handle: null as TransformHandle | null, time: 0 };
	let transformUi = $state<{
		bounds: { x: number; y: number; width: number; height: number };
		pivot: Point;
		offset: Point;
		scaleX: number;
		scaleY: number;
		rotation: number;
	} | null>(null);
	let transformRevision = $state(0);
	let handleBounds = $state<{ x: number; y: number; width: number; height: number } | null>(null);

	const transformPoints = $derived.by(() => {
		const t = transformUi;
		if (!t) return [];
		const b = t.bounds;
		const ox = t.offset.x;
		const oy = t.offset.y;
		const cos = Math.cos(t.rotation);
		const sin = Math.sin(t.rotation);
		const point = (x: number, y: number) => {
			const sx = (x - t.pivot.x) * t.scaleX;
			const sy = (y - t.pivot.y) * t.scaleY;
			return { x: t.pivot.x + t.offset.x + sx * cos - sy * sin, y: t.pivot.y + t.offset.y + sx * sin + sy * cos };
		};
		return [
			{ handle: 'nw' as TransformHandle, x: b.x + ox, y: b.y + oy },
			{ handle: 'n' as TransformHandle, x: b.x + b.width / 2 + ox, y: b.y + oy },
			{ handle: 'ne' as TransformHandle, x: b.x + b.width + ox, y: b.y + oy },
			{ handle: 'e' as TransformHandle, x: b.x + b.width + ox, y: b.y + b.height / 2 + oy },
			{ handle: 'se' as TransformHandle, x: b.x + b.width + ox, y: b.y + b.height + oy },
			{ handle: 's' as TransformHandle, x: b.x + b.width / 2 + ox, y: b.y + b.height + oy },
			{ handle: 'sw' as TransformHandle, x: b.x + ox, y: b.y + b.height + oy },
			{ handle: 'w' as TransformHandle, x: b.x + ox, y: b.y + b.height / 2 + oy },
			{ handle: 'pivot' as TransformHandle, x: t.pivot.x + t.offset.x, y: t.pivot.y + t.offset.y }
		].map((p) => {
			const screen = documentRegistry.active?.view ?? { zoom: 1, panX: 0, panY: 0 };
			const transformed = point(p.x - ox, p.y - oy);
			return { ...p, sx: screen.panX + transformed.x * screen.zoom, sy: screen.panY + transformed.y * screen.zoom };
		});
	});

	function syncTransformUi(): void {
		transformRevision++;
		const doc = documentRegistry.active;
		const selectionBounds =
			(ready ? getEditorRenderer().getActiveSelectionBounds() : null) ??
			doc?.selection.bounds ??
			doc?.selection.rect ??
			(doc?.selection.points?.length
				? (() => {
						const xs = doc.selection.points.map((p) => p.x);
						const ys = doc.selection.points.map((p) => p.y);
						return {
							x: Math.min(...xs),
							y: Math.min(...ys),
							width: Math.max(...xs) - Math.min(...xs),
							height: Math.max(...ys) - Math.min(...ys)
						};
					})()
				: null) ??
			(doc?.selection.outlineLoops?.length
				? (() => {
						const points = doc.selection.outlineLoops.flat();
						const xs = points.map((p) => p.x);
						const ys = points.map((p) => p.y);
						return {
							x: Math.min(...xs),
							y: Math.min(...ys),
							width: Math.max(...xs) - Math.min(...xs),
							height: Math.max(...ys) - Math.min(...ys)
						};
					})()
				: null);
		if (!doc || !selectionBounds) {
			transformUi = null;
			handleBounds = null;
			return;
		}
		handleBounds = { ...selectionBounds };

		const state = moveEngine?.transformState;
		if (state) {
			transformUi = { bounds: state.bounds, pivot: state.pivot, offset: state.offset, scaleX: state.scaleX, scaleY: state.scaleY, rotation: state.rotation };
		} else {
			const bounds = { ...selectionBounds };
			transformUi = {
				bounds,
				pivot: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
				offset: { x: 0, y: 0 },
				scaleX: 1,
				scaleY: 1,
				rotation: 0
			};
		}
	}

	function visibleTransformPoints(): Array<{ handle: TransformHandle; sx: number; sy: number }> {
		transformRevision;
		const doc = documentRegistry.active;
		if (get(activeToolId) !== 'move-pixels') return [];
		if (!doc || (!transformUi && !handleBounds)) return [];
		if (transformUi) {
			return transformPoints;
		}
		const bounds = handleBounds;
		if (!bounds) return [];
		const zoom = doc.view.zoom;
		const points: Array<[TransformHandle, number, number]> = [
			['nw', bounds.x, bounds.y], ['n', bounds.x + bounds.width / 2, bounds.y],
			['ne', bounds.x + bounds.width, bounds.y], ['e', bounds.x + bounds.width, bounds.y + bounds.height / 2],
			['se', bounds.x + bounds.width, bounds.y + bounds.height], ['s', bounds.x + bounds.width / 2, bounds.y + bounds.height],
			['sw', bounds.x, bounds.y + bounds.height], ['w', bounds.x, bounds.y + bounds.height / 2],
			['pivot', bounds.x + bounds.width / 2, bounds.y + bounds.height / 2]
		];
		return points.map(([handle, x, y]) => ({ handle, sx: doc.view.panX + x * zoom, sy: doc.view.panY + y * zoom }));
	}

	// move-selection-tool state (drag the SELECTION border, not the pixels)
	let moveSelEngine: MoveSelectionEngine | null = null;
	let moveSelArmed = $state(false);
	let movingSelection = $state(false);
	let moveSelPointerId = -1;

	// selection-tool state (rect / ellipse / lasso drags)
	let selectionArmed = $state(false);
	let selecting = $state(false);
	let selectPointerId = -1;
	let selDownClient = { x: 0, y: 0 }; // screen px (click vs drag threshold)
	let dragMode: 'replace' | 'add' | 'subtract' = 'replace'; // mode for the current drag
	let selStart: Point | null = null; // image px
	let lassoPts: Point[] = [];

	// polygon-lasso state (click to place vertices)
	let polyPts: Point[] = [];
	let polyBuilding = false;
	let polyLastClick: { pt: Point; time: number } | null = null;
	/** Selection mode captured from the FIRST click of the polygon being built
	 * (ctrl/shift = add, alt / right button = subtract, else options strip). */
	let polyMode: 'replace' | 'add' | 'subtract' = 'replace';

	// Paint.NET-style brush preview: an outline circle of the brush size (scaled
	// with the current zoom) follows the pointer. While it is shown the OS
	// pointer is hidden — also while painting, exactly like Paint.NET.
	let pointerX = $state(-1000);
	let pointerY = $state(-1000);
	let pointerInside = $state(false);
	let paintArmed = $state(false);
	let ringR = $state(0);

	const showRing = $derived(paintArmed && !panning && (pointerInside || painting));

	// OS pointer over the canvas: crosshair (the system "plus" cursor) while a
	// paint tool OR a selection tool is armed and NOT painting; fully hidden
	// while painting (only the preview ring + painted stroke are visible, like
	// Paint.NET). The brush preview ring itself only ever shows for paint tools.
	const cursorCss = $derived.by(() => {
		if (panning) return '';
		if (painting) return 'cursor: none;';
		if (moving) return 'cursor: move;';
		if (movingSelection) return 'cursor: move;';
		if (moveArmed) {
			if (!pointerInside) return '';
			const img = imageFromScreen({ x: pointerX, y: pointerY });
			return transformHandleAt(img) === 'rotate' ? 'cursor: grab;' : 'cursor: move;';
		}
		if (moveSelArmed) return pointerInside ? 'cursor: move;' : '';
		if (!(paintArmed || selectionArmed)) return '';
		return pointerInside ? 'cursor: crosshair;' : '';
	});

	const isPaintTool = () => PAINT_TOOLS.has(get(activeToolId)) && !!documentRegistry.active;

	function screenPoint(e: { clientX: number; clientY: number }) {
		const rect = host.getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

	function updateStatus(doc = documentRegistry.active, cursor?: { x: number; y: number }) {
		if (!doc) {
			statusBar.update((s) => ({ ...s, zoomPct: null, imageW: null, imageH: null, cursorX: null, cursorY: null }));
			return;
		}
		statusBar.update((s) => ({
			...s,
			zoomPct: Math.round(doc.view.zoom * 100),
			imageW: doc.width,
			imageH: doc.height,
			cursorX: cursor ? Math.floor(cursor.x) : s.cursorX,
			cursorY: cursor ? Math.floor(cursor.y) : s.cursorY
		}));
	}

	/** Re-evaluates whether a paint tool is armed (tool + open document). */
	function updateArmed(): void {
		const hasDoc = !!documentRegistry.active;
		paintArmed = PAINT_TOOLS.has(get(activeToolId)) && hasDoc;
		selectionArmed = SELECT_TOOLS.has(get(activeToolId)) && hasDoc;
		moveArmed = get(activeToolId) === 'move-pixels' && hasDoc;
		moveSelArmed = get(activeToolId) === 'move-selection' && hasDoc;
		syncTransformUi();
		if (ready) getEditorRenderer().setTransformHandlesVisible(moveArmed);
		refreshRing();
		// Switching away from the move tool drops (applies) a floating selection.
		if (moveEngine?.floating && !moveArmed) moveEngine.drop();
		// Switching away from the move-selection tool cancels an in-progress drag.
		if (moveSelEngine?.dragging && !moveSelArmed) moveSelEngine.cancel();
		// Debug: only log when the ACTIVE TOOL actually changed (not on every
		// pointer event), so we can see why switching tools misbehaves.
		if (lastLoggedTool !== get(activeToolId)) {
			lastLoggedTool = get(activeToolId);
			console.log(
				'[tool] active=',
				get(activeToolId),
				'paintArmed=',
				paintArmed,
				'selectionArmed=',
				selectionArmed,
				'doc=',
				hasDoc
			);
		}
		// Leaving the polygon tool mid-edit cancels the in-progress polygon.
		if (polyBuilding && get(activeToolId) !== 'select-poly') cancelPolygon();
	}

	/** Recomputes the ring radius from the brush size and the current zoom
	 * (zooming changes the on-screen size of the brush preview). */
	function refreshRing(): void {
		const doc = documentRegistry.active;
		ringR = paintArmed && doc ? (get(brushSize) / 2) * doc.view.zoom : 0;
	}

	/** Moves the brush preview to the pointer position. */
	function movePointer(sp: { x: number; y: number }): void {
		pointerX = sp.x;
		pointerY = sp.y;
		refreshRing();
	}

	function isTextTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		if (target.tagName === 'TEXTAREA') return true;
		if (target.tagName === 'INPUT') {
			const t = (target as HTMLInputElement).type;
			return ['text', 'search', 'number', 'email', 'url', 'password', 'tel'].includes(t);
		}
		return target.isContentEditable;
	}

	function onKeyDown(e: KeyboardEvent) {
		const typing = isTextTarget(e.target);
		// Escape cancels an in-progress selection drag AND clears an active
		// selection (Paint.NET behaviour). Guarded against typing inputs and
		// open modal dialogs so it never steals Escape from them.
		if (e.key === 'Escape' && !typing && !get(dialog).kind) {
			if (polyBuilding) {
				cancelPolygon();
				return;
			}
			if (selecting) cancelSelectDrag();
			// Escape always ends with NO selection: a floating move is first
			// cancelled (content returns to its source), then the selection —
			// if any — is dropped.
			if (moveEngine?.floating) {
				moveEngine.cancel();
				moving = false;
				movePointerId = -1;
			}
			// A move-selection drag is also interrupted: the selection reverts
			// to its original position before the selection itself is dropped.
			if (moveSelEngine?.dragging) {
				moveSelEngine.cancel();
				movingSelection = false;
				moveSelPointerId = -1;
			}
			if (documentRegistry.active?.selection.active) deselect();
			return;
		}
		// Enter drops (applies) a floating selection.
		if (moveEngine?.floating && e.key === 'Enter' && !typing && !get(dialog).kind) {
			e.preventDefault();
			moveEngine.drop();
			return;
		}
		// While a floating selection exists the document is in a transient state
		// — no other keyboard action may interleave. Escape cancels and Enter
		// drops; everything else waits until the selection is dropped.
		if (moveEngine?.floating) return;
		// Enter finishes an in-progress polygon-lasso selection.
		if (polyBuilding && e.key === 'Enter' && !typing && !get(dialog).kind) {
			e.preventDefault();
			finishPolygon();
			return;
		}
		// Undo / Redo and the selection commands — handled here directly
		// (layout-robust on every keyboard) so a brush stroke can always be
		// reverted with Ctrl+Z / Ctrl+Y and selections via Ctrl+A/D/I. The
		// stopPropagation below is required: the commands also carry shortcut
		// strings for the menu, and without it the global shortcut service
		// would run them a second time.
		if (!typing && (e.ctrlKey || e.metaKey) && !e.altKey && !get(dialog).kind) {
			const doc = documentRegistry.active;
			if (doc) {
				const key = e.key.toLowerCase();
				if (key === 'z') {
					e.preventDefault();
					e.stopPropagation();
					if (e.shiftKey) doc.history.redo();
					else doc.history.undo();
					documentRegistry.notifyChange(doc);
					return;
				}
				if (key === 'y') {
					e.preventDefault();
					e.stopPropagation();
					doc.history.redo();
					documentRegistry.notifyChange(doc);
					return;
				}
				if (key === 'a') {
					e.preventDefault();
					e.stopPropagation();
					selectAll();
					return;
				}
				if (key === 'd') {
					e.preventDefault();
					e.stopPropagation();
					deselect();
					return;
				}
				if (key === 'i') {
					e.preventDefault();
					e.stopPropagation();
					if (e.shiftKey) commands.run('adjustments.invertColors');
					else invertSelection();
					return;
				}
				// Copy/Cut always act on the selection (or the whole layer when
				// nothing is selected). Paste uses the internal clipboard; with an
				// empty one the keydown is left alone so the native paste event
				// (onPaste below) can pick up an OS-clipboard image.
				if (key === 'c' && !e.shiftKey) {
					e.preventDefault();
					e.stopPropagation();
					copySelection();
					return;
				}
				if (key === 'x' && !e.shiftKey) {
					e.preventDefault();
					e.stopPropagation();
					cutSelection();
					return;
				}
				if (key === 'v' && hasClipboardImage()) {
					e.preventDefault();
					e.stopPropagation();
					pasteAsNewLayer();
					return;
				}
			}
		}
		// Delete erases the selection content on the active layer (no
		// modifiers; guarded against typing in inputs and open dialogs).
		if (!typing && !get(dialog).kind && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'Delete') {
			if (documentRegistry.active?.selection.active) {
				e.preventDefault();
				e.stopPropagation();
				deleteSelection();
				return;
			}
		}
		// Backspace fills the active layer (or the current selection, when one
		// exists) with the foreground colour.
		if (!typing && !get(dialog).kind && !e.ctrlKey && !e.metaKey && !e.altKey && e.key === 'Backspace') {
			e.preventDefault();
			e.stopPropagation();
			fillSelection(get(foregroundColor));
			return;
		}
		if (e.code === 'Space' && !typing) {
			spaceHeld = true;
			e.preventDefault();
		}
	}
	function onKeyUp(e: KeyboardEvent) {
		if (e.code === 'Space') spaceHeld = false;
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		const doc = documentRegistry.active;
		if (!doc || !ready) return;
		const renderer = getEditorRenderer();
		const anchor = screenPoint(e);
		const factor = Math.exp(-e.deltaY * 0.0015);
		doc.view = zoomBy(doc.view, anchor, factor);
		renderer.refreshActiveView();
		updateStatus(doc);
		refreshRing(); // zoom changed the on-screen brush size
	}

	function imageFromScreen(sp: { x: number; y: number }): { x: number; y: number } {
		const doc = documentRegistry.active!;
		return screenToImage(doc.view, sp.x, sp.y);
	}

	// --- selection tools (rect / ellipse / lasso) -------------------------

	function selectionToolKind(): 'rect' | 'ellipse' | 'lasso' | null {
		const kind = SELECT_KIND[get(activeToolId)];
		return kind ?? null;
	}

	/** Returns the opposite (drag) corner for the RECTANGLE tool according to the
	 * selected Ratio mode: free (pass-through), fixed aspect ratio, or a fixed
	 * size. `start` is the anchor point, `cur` the raw pointer position. */
	function constrainRectCorner(start: Point, cur: Point): Point {
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
	function fixedRectAt(cur: Point): { x: number; y: number; width: number; height: number } {
		const s = get(selectionFixedSize);
		return { x: Math.round(cur.x), y: Math.round(cur.y), width: Math.max(1, s.width), height: Math.max(1, s.height) };
	}

	/** Live draft outline (solid) for the drag in progress. `cur` is the
	 * current pointer position in image px. */
	function showSelectDraft(cur: Point): void {		if (!ready) return;
		const kind = selectionToolKind();
		const start = selStart;
		if (!kind || !start) return;
		if (kind === 'lasso') {
			if (lassoPts.length >= 2) getEditorRenderer().previewSelectionOutline([lassoPts], false);
			return;
		}
		// rect/ellipse: outline follows the current pointer position (rectangle
		// tool honours the Free/Fixed-Ratio/Fixed-Size mode; Fixed Size moves a
		// free-floating box with its top-left under the pointer).
		let rect: { x: number; y: number; width: number; height: number };
		if (kind === 'rect' && get(selectionRatio) === 'fixedSize') {
			rect = fixedRectAt(cur);
		} else {
			const eff = kind === 'rect' ? constrainRectCorner(start, cur) : cur;
			rect = {
				x: Math.min(start.x, eff.x),
				y: Math.min(start.y, eff.y),
				width: Math.abs(eff.x - start.x),
				height: Math.abs(eff.y - start.y)
			};
		}
		const loop = selectionOutlinePoints(kind, rect, null);
		getEditorRenderer().previewSelectionOutline(loop.length ? [loop] : null, false);
	}

	/** Aborts a selection drag and restores the committed ants (if any). */
	function cancelSelectDrag(): void {
		selecting = false;
		selectPointerId = -1;
		selStart = null;
		lassoPts = [];
		if (ready) getEditorRenderer().refreshActiveSelection();
	}

	// --- polygon lasso (click to place vertices) ---------------------------

	/** Live draft preview of the polygon built so far (plus the current pointer). */
	function showPolyOutline(cur?: Point): void {
		if (!ready || !polyBuilding || polyPts.length === 0) return;
		const pts = cur ? [...polyPts, cur] : polyPts;
		getEditorRenderer().previewSelectionOutline(pts.length >= 2 ? [pts] : null, false);
	}

	/** Adds a vertex on a (single) click. A double-click (two quick clicks at
	 * ~the same point) finishes the polygon. `e.detail` is deliberately NOT
	 * used — pointer events do not carry a reliable click count in all
	 * browsers, so the double-click is detected by time + distance instead. */
	function polyClick(e: PointerEvent): void {
		const doc = documentRegistry.active;
		const img = imageFromScreen(screenPoint(e));
		const now = performance.now();
		const nearLast = !!polyLastClick && Math.hypot(img.x - polyLastClick.pt.x, img.y - polyLastClick.pt.y) < 8 / Math.max(doc?.view.zoom ?? 1, 1e-4);
		if (polyBuilding && polyPts.length >= 2 && polyLastClick && nearLast && now - polyLastClick.time < 500) {
			finishPolygon();
			return;
		}
		polyLastClick = { pt: img, time: now };
		if (!polyBuilding) {
			polyPts = [];
			polyBuilding = true;
			// the mode of the FIRST click applies to the whole polygon gesture
			polyMode = e.button === 2 || e.altKey ? 'subtract' : e.ctrlKey || e.shiftKey ? 'add' : get(selectionMode);
			getEditorRenderer().previewSelectionOutline(null, false);
		}
		polyPts.push(img);
		showPolyOutline();
	}

	/** Commits the polygon as a lasso selection (honouring the captured mode —
	 * add/subtract build a composite selection) and clears the draft. */
	function finishPolygon(): void {
		// the finishing double-click re-clicked the last vertex — drop that
		// duplicate so the polygon has no zero-length closing edge
		while (polyPts.length >= 2) {
			const a = polyPts[polyPts.length - 1];
			const b = polyPts[polyPts.length - 2];
			if (Math.hypot(a.x - b.x, a.y - b.y) < 1) polyPts.pop();
			else break;
		}
		const pts = polyPts;
		const mode = polyMode;
		polyPts = [];
		polyBuilding = false;
		if (pts.length >= 2) applySelectionMode(mode, 'lasso', pts[0], pts[0], pts);
		if (ready) getEditorRenderer().refreshActiveSelection();
	}

	/** Cancels the in-progress polygon (the committed selection, if any, stays). */
	function cancelPolygon(): void {
		polyPts = [];
		polyBuilding = false;
		if (ready) getEditorRenderer().refreshActiveSelection();
	}

	/** Starts (or continues) a floating-selection drag gesture. */
	function startMoveDrag(e: PointerEvent, img: Point): void {
		moveEngine?.beginTransform('move', img);
		moving = true;
		movePointerId = e.pointerId;
		try {
			host.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function transformHandleAt(img: Point): TransformHandle | null {
		const t = moveEngine?.transformState ?? transformUi;
		const doc = documentRegistry.active;
		if (!t || !doc) return null;
		const b = t.bounds;
		const threshold = 10 / Math.max(doc.view.zoom, 0.01);
		const cos = Math.cos(t.rotation);
		const sin = Math.sin(t.rotation);
		const transformed = (x: number, y: number): Point => {
			const sx = (x - t.pivot.x) * t.scaleX;
			const sy = (y - t.pivot.y) * t.scaleY;
			return { x: t.pivot.x + t.offset.x + sx * cos - sy * sin, y: t.pivot.y + t.offset.y + sx * sin + sy * cos };
		};
		const pivot = { x: t.pivot.x + t.offset.x, y: t.pivot.y + t.offset.y };
		if (Math.hypot(img.x - pivot.x, img.y - pivot.y) <= threshold) return 'pivot';
		const points: Array<[TransformHandle, Point]> = [
			['nw', transformed(b.x, b.y)], ['n', transformed(b.x + b.width / 2, b.y)], ['ne', transformed(b.x + b.width, b.y)],
			['e', transformed(b.x + b.width, b.y + b.height / 2)], ['se', transformed(b.x + b.width, b.y + b.height)],
			['s', transformed(b.x + b.width / 2, b.y + b.height)], ['sw', transformed(b.x, b.y + b.height)],
			['w', transformed(b.x, b.y + b.height / 2)]
		];
		for (const [handle, p] of points) if (Math.hypot(img.x - p.x, img.y - p.y) <= threshold) return handle;
		const outside = Math.hypot(img.x - pivot.x, img.y - pivot.y) > Math.min(b.width, b.height) / 2;
		const nearHandle = points.some(([, p]) => Math.hypot(img.x - p.x, img.y - p.y) <= 24 / Math.max(doc.view.zoom, 0.01));
		if (outside && nearHandle) return 'rotate';
		return null;
	}

	function beginTransformDrag(e: PointerEvent, img: Point, handle: TransformHandle): void {
		if (!moveEngine) return;
		moveEngine.beginTransform(handle, img);
		transformHandle = handle;
		moving = true;
		movePointerId = e.pointerId;
		try {
			host.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function resetPivotToCenter(): void {
		const state = moveEngine?.transformState;
		if (!state || !moveEngine) return;
		moveEngine.setPivot({
			x: state.bounds.x + state.bounds.width / 2,
			y: state.bounds.y + state.bounds.height / 2
		});
		syncTransformUi();
	}

	function onPointerDown(e: PointerEvent) {
		if (!ready) return;
		movePointer(screenPoint(e));
		const wantsPan = e.button === 1 || (e.button === 0 && spaceHeld);
		if (wantsPan) {
			e.preventDefault();
			const doc = documentRegistry.active;
			if (!doc) return;
			panning = true;
			panPointerId = e.pointerId;
			panStart = { x: e.clientX, y: e.clientY };
			panStartView = { panX: doc.view.panX, panY: doc.view.panY };
			try {
				host.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			return;
		}
		// Polygon lasso: clicks place vertices (left = chosen mode with
		// Ctrl/Shift = add, Alt = subtract; right button always subtracts);
		// a double-click finishes the polygon.
		if ((e.button === 0 || e.button === 2) && selectionArmed && isPolyTool()) {
			e.preventDefault();
			polyClick(e);
			return;
		}
		// Selection tools: a LEFT drag selects with the chosen mode (Ctrl or
		// Shift = add, Alt = subtract, else the options-strip mode); a
		// RIGHT-button drag always subtracts. The draft outline is shown live
		// and committed on pointer-up.
		if ((e.button === 0 || e.button === 2) && selectionArmed && selectionToolKind()) {
			dragMode = e.button === 2 || e.altKey ? 'subtract' : e.ctrlKey || e.shiftKey ? 'add' : get(selectionMode);
			console.log('[editor] pointerdown: selection tool', get(activeToolId), 'kind', selectionToolKind(), 'mode', dragMode);
			e.preventDefault();
			selecting = true;
			selectPointerId = e.pointerId;
			selDownClient = { x: e.clientX, y: e.clientY };
			selStart = imageFromScreen(screenPoint(e));
			lassoPts = [selStart];
			try {
				host.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			getEditorRenderer().previewSelectionOutline(null, false);
			return;
		}
		// Move tool, Paint.NET style: the FIRST press inside the selection lifts
		// the content into a floating preview; further presses inside re-drag it;
		// a press OUTSIDE the selection drops (applies) it and is consumed.
		if (e.button === 0 && moveArmed) {
			e.preventDefault();
			const img = imageFromScreen(screenPoint(e));
			if (!moveEngine) moveEngine = new MoveEngine(getEditorRenderer());
			// Refresh the handle geometry before hit-testing. The engine is
			// authoritative while a floating selection is being transformed.
			syncTransformUi();
			const handle = transformHandleAt(img);
			logTransformDebug('canvas.pointerdown', {
				pointer: img,
				handle,
				floating: moveEngine.floating,
				transform: moveEngine.transformState
			});
			const now = performance.now();
			if (handle === 'pivot' && lastTransformClick.handle === 'pivot' && now - lastTransformClick.time < 400) {
				resetPivotToCenter();
				lastTransformClick = { handle: null, time: 0 };
				return;
			}
			lastTransformClick = { handle, time: now };
			if (moveEngine.floating) {
				if (handle) beginTransformDrag(e, img, handle);
				else if (moveEngine.pointInSelection(img)) startMoveDrag(e, img);
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
				} else beginTransformDrag(e, img, activeHandle);
			}
			return;
		}
		// Move-Selection tool: drags the SELECTION (mask + outline), NOT the
		// pixels. Click outside a live selection drops the selection (Paint.NET
		// behaviour). Click inside arms a drag — release commits the move.
		if (e.button === 0 && moveSelArmed) {
			e.preventDefault();
			const doc = documentRegistry.active;
			if (!doc) return;
			if (!doc.selection.active) {
				showNotice('Draw a selection first.');
				return;
			}
			if (!moveSelEngine) moveSelEngine = new MoveSelectionEngine(getEditorRenderer());
			const img = imageFromScreen(screenPoint(e));
			if (moveSelEngine.begin(img)) {
				movingSelection = true;
				moveSelPointerId = e.pointerId;
				try {
					host.setPointerCapture(e.pointerId);
				} catch {
					/* ignore */
				}
			} else {
				// No usable selection (e.g. mask surface is missing): drop it.
				deselect();
			}
			return;
		}
		// Any other tool/action first drops a floating selection (Paint.NET
		// behaviour): the content is stamped at its current position.
		if (moveEngine?.floating) moveEngine.drop();
		// Paint with the LEFT button in the foreground colour and with the RIGHT
		// button in the background colour (Paint.NET behaviour). Right-button
		// painting also suppresses the context menu (preventDefault + the
		// App-level oncontextmenu guard), so it never interrupts a stroke.
		if ((e.button === 0 || e.button === 2) && isPaintTool()) {
			e.preventDefault();
			painting = true;
			paintPointerId = e.pointerId;
			try {
				host.setPointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			if (!engine) engine = new BrushEngine(getEditorRenderer());
			const img = imageFromScreen(screenPoint(e));
			const color = e.button === 2 ? get(backgroundColor) : get(foregroundColor);
			engine.begin(
				{
					kind: KIND[get(activeToolId)] ?? 'brush',
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
	}

	function onPointerMove(e: PointerEvent) {
		const sp = screenPoint(e);
		const doc = documentRegistry.active;
		if (ready && doc) {
			if (polyBuilding && isPolyTool() && !panning) {
				showPolyOutline(imageFromScreen(sp)); // live polygon preview follows the pointer
			}
			if (panning && e.pointerId === panPointerId) {
				doc.view.panX = panStartView.panX + (e.clientX - panStart.x);
				doc.view.panY = panStartView.panY + (e.clientY - panStart.y);
				getEditorRenderer().refreshActiveView();
				return;
			}
			if (painting && e.pointerId === paintPointerId && engine) {
				engine.lineTo(imageFromScreen(sp));
			}
			if (moving && e.pointerId === movePointerId && moveEngine) {
				if (transformHandle) moveEngine.transformTo(imageFromScreen(sp), e.shiftKey, e.altKey);
				else moveEngine.moveTo(imageFromScreen(sp));
				syncTransformUi();
			}
			if (movingSelection && e.pointerId === moveSelPointerId && moveSelEngine) {
				moveSelEngine.moveTo(imageFromScreen(sp));
			}
			if (selecting && e.pointerId === selectPointerId && selStart) {
				const img = imageFromScreen(sp);
				if (get(activeToolId) === 'lasso') {
					const last = lassoPts[lassoPts.length - 1];
					if (!last || Math.hypot(img.x - last.x, img.y - last.y) >= 1) {
						lassoPts.push(img);
					}
				}
				showSelectDraft(img);
			}
		}
		movePointer(sp);
		if (!doc || !ready) return;
		const image = screenToImage(doc.view, sp.x, sp.y);
		if (image.x >= 0 && image.y >= 0 && image.x < doc.width && image.y < doc.height) {
			updateStatus(doc, { x: image.x, y: image.y });
		} else {
			updateStatus(doc);
		}
	}

	function endPointer(e: PointerEvent) {
		if (painting && e.pointerId === paintPointerId) {
			engine?.finish();
			painting = false;
			paintPointerId = -1;
			try {
				host.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
		if (moving && e.pointerId === movePointerId) {
			// release only ends the drag — the floating selection stays floating
			// until it is dropped (click outside / Enter / tool switch)
			moving = false;
			movePointerId = -1;
			transformHandle = null;
			try {
				host.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			syncTransformUi();
			logTransformDebug('canvas.pointerup', { transform: moveEngine?.transformState });
		}
		if (movingSelection && e.pointerId === moveSelPointerId) {
			// pointer-up commits the move as a single history entry (no-op when
			// the user clicked without dragging)
			moveSelEngine?.commit();
			movingSelection = false;
			moveSelPointerId = -1;
			try {
				host.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
		if (panning && e.pointerId === panPointerId) {
			panning = false;
			panPointerId = -1;
			try {
				host.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
		if (selecting && e.pointerId === selectPointerId) {
			commitSelect(e);
			try {
				host.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
	}

	/** Commits the selection drag (mask fill + model update) when it was a real
	 * drag and not a plain click. */
	function commitSelect(e: PointerEvent): void {
		const doc = documentRegistry.active;
		const kind = selectionToolKind();
		const start = selStart;
		selecting = false;
		selectPointerId = -1;
		selStart = null;
		if (!doc || !kind || !start) {
			lassoPts = [];
			if (ready) getEditorRenderer().refreshActiveSelection();
			return;
		}
		const upRaw = imageFromScreen(screenPoint(e));
		const up =
			kind === 'rect' && get(selectionRatio) !== 'fixedSize' ? constrainRectCorner(start, upRaw) : upRaw;
		if (kind === 'rect' && get(selectionRatio) === 'fixedSize') {
			// Fixed Size: freely place the fixed box at the release point.
			applySelectionRect(dragMode, 'rect', fixedRectAt(upRaw));
		} else if (kind === 'lasso') {
			const last = lassoPts[lassoPts.length - 1];
			if (!last || Math.hypot(upRaw.x - last.x, upRaw.y - last.y) >= 1) lassoPts.push(upRaw);
			if (lassoPts.length >= 2) applySelectionMode(dragMode, 'lasso', start, start, lassoPts);
		} else if (Math.hypot(e.clientX - selDownClient.x, e.clientY - selDownClient.y) >= SELECT_DRAG_MIN) {
			applySelectionMode(dragMode, kind, start, up, []);
		}
		lassoPts = [];
		// The draft wiped the committed ants — redraw whatever the model now says.
		if (ready) getEditorRenderer().refreshActiveSelection();
	}

	function cancelPointer(e: PointerEvent) {
		if (painting && e.pointerId === paintPointerId) {
			engine?.cancel();
			painting = false;
			paintPointerId = -1;
		}
		if (moving && e.pointerId === movePointerId) {
			// interrupted drag: keep the floating selection where it was
			moving = false;
			movePointerId = -1;
		}
		if (movingSelection && e.pointerId === moveSelPointerId) {
			// interrupted drag: keep the new selection position (mirrors MoveEngine
			// behaviour; the user can still drop via click-outside / Enter)
			movingSelection = false;
			moveSelPointerId = -1;
		}
		if (selecting && e.pointerId === selectPointerId) {
			cancelSelectDrag();
		}
		if (panning && e.pointerId === panPointerId) {
			panning = false;
			panPointerId = -1;
		}
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer?.files?.length) void openFiles(e.dataTransfer.files);
	}

	/**
	 * Native paste (Ctrl+V with an empty internal clipboard, or context-menu
	 * paste): pastes an OS-clipboard IMAGE as a new layer of the active document
	 * — or, with no document open, as a new tab. Text pastes are ignored.
	 */
	function onPaste(e: ClipboardEvent) {
		if (isTextTarget(e.target) || get(dialog).kind) return;
		const items = e.clipboardData?.items;
		if (!items) return;
		for (const item of Array.from(items)) {
			if (!item.type.startsWith('image/')) continue;
			const file = item.getAsFile();
			if (!file) continue;
			e.preventDefault();
			void (async () => {
				if (!documentRegistry.active) {
					await openFiles([file]);
					return;
				}
				try {
					pasteBitmapAsLayer(await createImageBitmap(file));
				} catch {
					showNotice('Could not paste the clipboard image.', 'error');
				}
			})();
			return;
		}
	}

	function measure() {
		if (!ready) return;
		const w = Math.max(1, Math.round(host.clientWidth));
		const h = Math.max(1, Math.round(host.clientHeight));
		getEditorRenderer().resize(w, h);
	}

	onMount(() => {
		let alive = true;
		const disposers: Array<() => void> = [];

		const attach = () => {
			ready = true;
			measure();

			const ro = new ResizeObserver(() => measure());
			ro.observe(host);
			disposers.push(() => ro.disconnect());

			disposers.push(
				documentRegistry.events.on(RegistryEvents.active, () => {
					updateStatus(documentRegistry.active);
					updateArmed();
				})
			);
			disposers.push(
				documentRegistry.events.on(RegistryEvents.changed, () => {
					syncTransformUi();
				})
			);
			const unTool = activeToolId.subscribe((tool) => {
				moveToolSelected = tool === 'move-pixels';
				updateArmed();
				syncTransformUi();
			});
			const unSize = brushSize.subscribe(() => refreshRing());
			// Polygon-lasso options strip → finish/cancel requests.
			const unPoly = polygonAction.subscribe((a) => {
				if (!a) return;
				if (a === 'finish') finishPolygon();
				else cancelPolygon();
				polygonAction.set(null);
			});
			disposers.push(unTool, unSize, unPoly);

			const onEnter = () => {
				pointerInside = true;
				syncTransformUi();
			};
			const onLeave = () => {
				pointerInside = false;
			};

			host.addEventListener('wheel', onWheel, { passive: false });
			host.addEventListener('pointerdown', onPointerDown);
			host.addEventListener('pointermove', onPointerMove);
			host.addEventListener('pointerup', endPointer);
			host.addEventListener('pointercancel', cancelPointer);
			host.addEventListener('pointerenter', onEnter);
			host.addEventListener('pointerleave', onLeave);
			host.addEventListener('dragover', onDragOver);
			host.addEventListener('drop', onDrop);
			window.addEventListener('keydown', onKeyDown, true);
			window.addEventListener('keyup', onKeyUp);
			window.addEventListener('paste', onPaste);
			disposers.push(() => {
				host.removeEventListener('wheel', onWheel);
				host.removeEventListener('pointerdown', onPointerDown);
				host.removeEventListener('pointermove', onPointerMove);
				host.removeEventListener('pointerup', endPointer);
				host.removeEventListener('pointercancel', cancelPointer);
				host.removeEventListener('pointerenter', onEnter);
				host.removeEventListener('pointerleave', onLeave);
				host.removeEventListener('dragover', onDragOver);
				host.removeEventListener('drop', onDrop);
				window.removeEventListener('keydown', onKeyDown, true);
				window.removeEventListener('keyup', onKeyUp);
				window.removeEventListener('paste', onPaste);
			});

			updateStatus(documentRegistry.active);
			updateArmed();
		};

		void initEditorRenderer(canvasEl).then(() => {
			if (alive) attach();
		});

		return () => {
			alive = false;
			for (const d of disposers) d();
		};
	});
</script>

<div
	bind:this={host}
	class="relative h-full w-full overflow-hidden select-none"
	style="touch-action: none; {cursorCss}"
>
	<canvas bind:this={canvasEl} class="absolute inset-0 block h-full w-full" style="touch-action:none;"></canvas>
	{#if showRing}
		<div
			class="brush-preview-ring pointer-events-none absolute z-10"
			style="left:{pointerX - ringR}px; top:{pointerY - ringR}px; width:{ringR * 2}px; height:{ringR * 2}px;"
		></div>
	{/if}
	{#each visibleTransformPoints() as point}
		<div
			class="pointer-events-none absolute z-20 box-border border border-white bg-blue-500 shadow-[0_0_0_1px_#1e3a8a]"
			class:rounded-full={point.handle === 'pivot' || point.handle === 'rotate'}
			style="left:{point.sx - (point.handle === 'pivot' || point.handle === 'rotate' ? 5 : 4)}px; top:{point.sy - (point.handle === 'pivot' || point.handle === 'rotate' ? 5 : 4)}px; width:{point.handle === 'pivot' || point.handle === 'rotate' ? 10 : 8}px; height:{point.handle === 'pivot' || point.handle === 'rotate' ? 10 : 8}px;"
		></div>
	{/each}
</div>
