<script lang="ts">
	// Layer: components -> hosts <canvas>, routes pointers to viewport pan/zoom and
	// to the active paint tool. No pixi symbols imported here.
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { documentRegistry, RegistryEvents } from '../../core/document/registry';
	import type { Point, Rect } from '../../core/geometry';
	import { pointInPolygon, rectFromCorners } from '../../core/geometry';
	import { screenToImage, imageToScreen, zoomBy } from '../../render/Viewport';
	import { getEditorRenderer, initEditorRenderer } from '../../render/EditorRenderer';
	import { BrushEngine } from '../../render/BrushEngine';
	import { CloneEngine } from '../../render/CloneEngine';
	import { RecolorEngine } from '../../render/RecolorEngine';
	import { affinePoint } from '../../render/affine';
	import { MoveEngine } from '../../render/MoveEngine';
	import { MoveSelectionEngine } from '../../render/MoveSelectionEngine';
	import type { TransformHandle } from '../../render/MoveEngine';
	import { logTransformDebug } from '../../render/transformDebug';
	import rotateClockwiseCursor from '../../assets/rotate-clockwise.svg';
	import rotateCounterclockwiseCursor from '../../assets/rotate-counterclockwise.svg';
	import { selectionOutlinePoints } from '../../render/selection';
	import { openFiles } from '../../services/fileService';
	import {
		pasteBitmapAsLayer
	} from '../../services/clipboardService';
	import { dialog } from '../../services/dialogService';
	import { applyCheckerTheme } from '../../services/commands';
	import { restoreSession, startSessionPersistence, type SessionPersistence } from '../../services/sessionService';
	import { applySelectionMode } from '../../services/selectionService';
	import {
		activeToolId,
		statusBar,
		brushSize,
		foregroundColor,
		backgroundColor,
		moveToolMode,
		selectionMode,
		selectionRatio,
		showNotice
	} from '../../state/ui';
	import { polygonAction } from '../../state/polygon';
	import { commitTextDraft as persistTextDraft } from '../../services/textService';
	import type { TextContent } from '../../core/layers/Layer';
	import { cloneSize } from '../../state/clone';
	import { recolorSize } from '../../state/recolor';
	import {
		textFontFamily,
		textFontSize,
		textBold,
		textItalic,
		textUnderline,
		textStrike,
		textAlign,
		textAction
	} from '../../state/text';
	import { commitShapeToLayer } from '../../render/shapes';
	import { commitLineToLayer, straightLineControls } from '../../render/lines';
	import { commitGradientToLayer, buildGradientSurface } from '../../render/gradients';
	import {
		shapeKind,
		shapeWidth,
		shapeLineStyle,
		shapeDrawStyle
	} from '../../state/shapes';
	import { lineWidth, lineStyle, lineArrowStart, lineArrowEnd, lineAction } from '../../state/lines';
	import { gradientMode, gradientRepeat, gradientAction } from '../../state/gradients';
	import { ensureSystemFontLoaded, withTimeout } from '../../services/fonts';
	import { rgbaToCss } from '../../core/color';
	import {
		PAINT_TOOLS,
		SELECT_TOOLS
	} from './tools';
	import ShapePreview from './ShapePreview.svelte';
	import LinePreview from './LinePreview.svelte';
	import { handleKeyDown, handleKeyUp, isTextTarget, type KeyApi } from './keyboard';
	import {
		handleEndPointer,
		handleCancelPointer,
		clampSelectionPoint,
		constrainRectCorner,
		fixedRectAt,
		selectionToolKind
	} from './pointerRelease';
	import type { PointerApi } from './pointerRelease';
	import {
		handlePointerDown,
		type PointerDownApi,
		type ShapeDraftState,
		type LineDraftState,
		type GradientDraftState
	} from './pointerDown';
	/** Polygon-lasso tool (click to place vertices). */
	const isPolyTool = () => get(activeToolId) === 'select-poly';
	// debug: last tool id that was logged (avoid console spam)
	let lastLoggedTool: string | null = null;
	let lastTransformCursorDebug = '';

let host: HTMLDivElement;
let canvasEl: HTMLCanvasElement;
let ready = false;

// UI interaction state
let spaceHeld = false;
let panning = $state(false);
let panPointerId = -1;
let panStart = { x: 0, y: 0 };
let panStartView = { panX: 0, panY: 0 };

// Pointer arm state
let panArmed = $state(false);
let zoomArmed = $state(false);
let zoomRightHeld = $state(false);

// Painting state
// (see engine, painting, paintPointerId declarations below)
	let engine: BrushEngine | null = null;
	let painting = $state(false);
	let paintPointerId = -1;

	// clone-stamp state (Alt+click sets the source, strokes stamp it)
	let cloneEngine: CloneEngine | null = null;
	let cloning = $state(false);
	let clonePointerId = -1;

	// recolor state (paints foreground, preserves destination alpha)
	let recolorEngine: RecolorEngine | null = null;
	let recoloring = $state(false);
	let recolorPointerId = -1;

	// move-tool state (drag the selection content; commits on pointer-up)
	let moveEngine: MoveEngine | null = null;
	let moveArmed = $state(false);
	let moving = $state(false);
	let movePointerId = -1;
	let transformHandle: TransformHandle | null = null;
	let lastTransformClick = { handle: null as TransformHandle | null, time: 0 };
	interface TransformUiState {
		bounds: Rect;
		pivot: Point;
		offset: Point;
		scaleX: number;
		scaleY: number;
		rotation: number;
		skewX?: number;
		skewY?: number;
	}
	let transformUi = $state<TransformUiState | null>(null);
	let transformRevision = $state(0);
	let handleBounds = $state<Rect | null>(null);

	const transformPoints = $derived.by(() => {
		transformRevision;
		const t = transformUi;
		if (!t) return [];
		const b = t.bounds;
		const state = {
			pivot: t.pivot,
			offset: t.offset,
			scaleX: t.scaleX,
			scaleY: t.scaleY,
			rotation: t.rotation,
			skewX: t.skewX ?? 0,
			skewY: t.skewY ?? 0
		};
		const point = (x: number, y: number) => affinePoint(state, { x, y });
		return [
			{ handle: 'nw' as TransformHandle, x: b.x, y: b.y },
			{ handle: 'n' as TransformHandle, x: b.x + b.width / 2, y: b.y },
			{ handle: 'ne' as TransformHandle, x: b.x + b.width, y: b.y },
			{ handle: 'e' as TransformHandle, x: b.x + b.width, y: b.y + b.height / 2 },
			{ handle: 'se' as TransformHandle, x: b.x + b.width, y: b.y + b.height },
			{ handle: 's' as TransformHandle, x: b.x + b.width / 2, y: b.y + b.height },
			{ handle: 'sw' as TransformHandle, x: b.x, y: b.y + b.height },
			{ handle: 'w' as TransformHandle, x: b.x, y: b.y + b.height / 2 },
			{ handle: 'pivot' as TransformHandle, x: t.pivot.x, y: t.pivot.y }
		].map((p) => {
			const screen = documentRegistry.active?.view ?? { zoom: 1, panX: 0, panY: 0 };
			const transformed = point(p.x, p.y);
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

		const state = get(activeToolId) === 'move-selection'
			? moveSelEngine?.transformState
			: moveEngine?.transformState;
		if (state) {
			transformUi = {
				bounds: state.bounds,
				pivot: state.pivot,
				offset: state.offset,
				scaleX: state.scaleX,
				scaleY: state.scaleY,
				rotation: state.rotation,
				skewX: (state as { skewX?: number }).skewX ?? 0,
				skewY: (state as { skewY?: number }).skewY ?? 0
			};
		} else {
			const bounds = { ...selectionBounds };
			transformUi = {
				bounds,
				pivot: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
				offset: { x: 0, y: 0 },
				scaleX: 1,
				scaleY: 1,
				rotation: 0,
				skewX: 0,
				skewY: 0
			};
		}
		if (get(activeToolId) === 'move-selection' && moveSelEngine?.dragging) {
			moveSelEngine.refreshPreview();
		}
	}

	function visibleTransformPoints(): Array<{ handle: TransformHandle; sx: number; sy: number }> {
		transformRevision;
		const doc = documentRegistry.active;
		if (get(activeToolId) !== 'move-pixels' && get(activeToolId) !== 'move-selection') return [];
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
	let cloneArmed = $state(false);
	let recolorArmed = $state(false);
	let ringR = $state(0);

	const isPencil = () => get(activeToolId) === 'pencil' && !!documentRegistry.active;
	const showRing = $derived(
		(paintArmed || cloneArmed || recolorArmed) && !panning && !isPencil() && (pointerInside || painting || cloning || recoloring)
	);

	// text-tool draft: click places an anchor, the overlay textarea edits.
	// Clicking a text layer's box reopens it for editing (style controls
	// sync); anywhere else starts a fresh draft. Commit renders into a text
	// layer that stays editable.
	let textDraft = $state<{
		imgX: number;
		imgY: number;
		sx: number;
		sy: number;
		zoom: number;
		layerId: string | null;
	} | null>(null);
	let textValue = $state('');
	let textAreaEl: HTMLTextAreaElement | undefined = $state();

	/** Syncs the text style controls (and fg colour) from stored content. */
	function applyTextStyle(t: TextContent): void {
		textFontFamily.set(t.family || 'Arial');
		textFontSize.set(Math.max(8, Math.min(200, Math.round(t.size) || 24)));
		textBold.set(t.bold);
		textItalic.set(t.italic);
		textUnderline.set(t.underline);
		textStrike.set(t.strike);
		textAlign.set(t.align);
		foregroundColor.set({ ...t.color });
	}

	function openTextDraft(e: PointerEvent): void {
		const doc = documentRegistry.active;
		if (!doc) return;
		if (textDraft) void commitTextDraft();
		const sp = screenPoint(e);
		const img = imageFromScreen(sp);
		// Edit the active text layer when the click lands inside its text
		// box, otherwise start a fresh draft (new text layer on commit).
		let layerId: string | null = null;
		let ax = Math.round(img.x);
		let ay = Math.round(img.y);
		const active = doc.activeLayer;
		const t = active?.kind === 'text' ? active.text : undefined;
		if (active && t) {
			const tol = 8 / Math.max(doc.view.zoom, 0.01);
			if (img.x >= t.x - tol && img.y >= t.y - tol && img.x <= t.x + t.width + tol && img.y <= t.y + t.height + tol) {
				layerId = active.id;
				applyTextStyle(t);
				textValue = t.text;
				ax = t.x;
				ay = t.y;
			}
		}
		if (!layerId) textValue = '';
		const snapped = imageToScreen(doc.view, ax, ay);
		textDraft = { imgX: ax, imgY: ay, sx: snapped.x, sy: snapped.y, zoom: doc.view.zoom, layerId };
		// Activate the family in the background so the overlay renders in it.
		void ensureSystemFontLoaded(get(textFontFamily), { bold: get(textBold), italic: get(textItalic) });
		// focus after the overlay mounts
		requestAnimationFrame(() => textAreaEl?.focus());
	}

	async function commitTextDraft(): Promise<void> {
		const draft = textDraft;
		// Capture synchronously — the commit awaits font loading, during which
		// a new draft may already reset these.
		const text = textValue;
		const layerId = draft?.layerId ?? null;
		textDraft = null;
		textValue = '';
		if (!draft) return;
		if (!text.trim()) return;
		const family = get(textFontFamily);
		const size = get(textFontSize);
		const bold = get(textBold);
		const italic = get(textItalic);
		try {
			// Wait (bounded) for the real font — otherwise canvas falls back.
			await withTimeout(ensureSystemFontLoaded(family, { bold, italic }), 5000, false);
			try {
				await withTimeout(
					document.fonts.load(`${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px "${family}"`, text),
					3000,
					[]
				);
			} catch {
				/* fall back to whatever is available */
			}
			const ok = persistTextDraft(
				{
					x: draft.imgX,
					y: draft.imgY,
					text,
					family,
					size,
					bold,
					italic,
					underline: get(textUnderline),
					strike: get(textStrike),
					align: get(textAlign),
					color: get(foregroundColor)
				},
				layerId
			);
			if (!ok) showNotice('Could not commit text.', 'error');
		} catch (err) {
			console.error('[text] commit failed', err);
			showNotice('Could not commit text.', 'error');
		}
	}

	function cancelTextDraft(): void {
		textDraft = null;
		textValue = '';
	}

	// shapes-tool draft (Paint.NET nub): drag defines the bounding box, the
	// overlay previews, release rasterises into the active layer (no live
	// object). Right-button drag swaps the outline/fill colours.
	let shapeDraft = $state<{
		startX: number;
		startY: number;
		curX: number;
		curY: number;
		swap: boolean;
	} | null>(null);
	let shapePointerId = -1;

	function cancelShapeDraft(): void {
		shapeDraft = null;
		shapePointerId = -1;
	}

	// line/curve-tool draft: the first drag draws straight (controls follow
	// at 1/3 and 2/3); after release 4 draggable nubs bend the cubic Bézier.
	// A click elsewhere commits the open line first. Right button swaps colour
	// (single fg colour for lines — swap is a no-op kept for symmetry).
	let lineDraft = $state<{
		p0: Point;
		p1: Point;
		p2: Point;
		p3: Point;
		swap: boolean;
		drawing: boolean;
	} | null>(null);
	let linePointerId = -1;
	/** Nub index currently dragged via the forgiving canvas grab (or div). */
	let lineNubDrag: 0 | 1 | 2 | 3 | null = null;

	function cancelLineDraft(): void {
		lineDraft = null;
		linePointerId = -1;
		lineNubDrag = null;
	}

	function finishLineDraft(): void {
		const draft = lineDraft;
		lineDraft = null;
		linePointerId = -1;
		lineNubDrag = null;
		if (!draft) return;
		const doc = documentRegistry.active;
		if (!doc) return;
		const fg = get(foregroundColor);
		const bg = get(backgroundColor);
		const startArrow = get(lineArrowStart);
		const endArrow = get(lineArrowEnd);
		const ok = commitLineToLayer(getEditorRenderer(), doc, {
			p0: draft.p0,
			p1: draft.p1,
			p2: draft.p2,
			p3: draft.p3,
			lineWidth: get(lineWidth),
			lineStyle: get(lineStyle),
			arrow: startArrow ? (endArrow ? 'both' : 'start') : endArrow ? 'end' : 'none',
			color: draft.swap ? bg : fg
		});
		if (!ok) showNotice('Could not draw line.', 'error');
	}

	/** Drags one of the 4 spline nubs (same capture pattern as the text nub). */
	function onLineNubDown(e: PointerEvent, i: 0 | 1 | 2 | 3): void {
		if (!lineDraft) return;
		e.preventDefault();
		e.stopPropagation();
		const nub = e.currentTarget as HTMLElement;
		capturePointer(e, nub);
		// The host pointer handlers perform the move (same as a near-canvas
		// grab) — no element listeners, so nothing can leak.
		lineNubDrag = i;
		linePointerId = e.pointerId;
		console.info('[line]', `grab nub ${i}`);
	}

	function finishShapeDraft(): void {
		const draft = shapeDraft;
		shapeDraft = null;
		shapePointerId = -1;
		if (!draft) return;
		const doc = documentRegistry.active;
		if (!doc) return;
		const r = rectFromCorners({ x: draft.startX, y: draft.startY }, { x: draft.curX, y: draft.curY });
		if (r.width < 2 || r.height < 2) return; // click without drag paints nothing
		const fg = get(foregroundColor);
		const bg = get(backgroundColor);
		const ok = commitShapeToLayer(getEditorRenderer(), doc, {
			x: r.x,
			y: r.y,
			width: r.width,
			height: r.height,
			kind: get(shapeKind),
			lineWidth: get(shapeWidth),
			lineStyle: get(shapeLineStyle),
			drawStyle: get(shapeDrawStyle),
			outline: draft.swap ? bg : fg,
			fill: draft.swap ? fg : bg
		});
		if (!ok) showNotice('Could not draw shape.', 'error');
	}

	/** Drags the uncommitted text draft by its nub (Paint.NET behaviour). */
	function onTextNubDown(e: PointerEvent): void {
		if (!textDraft) return;
		e.preventDefault();
		e.stopPropagation();
		const nub = e.currentTarget as HTMLElement;
		capturePointer(e, nub);
		const move = (ev: PointerEvent) => {
			if (!textDraft) return;
			const rect = host.getBoundingClientRect();
			const doc = documentRegistry.active;
			// Same 1px snap as on placement: free dragging, pixel-exact land.
			const imgX = doc ? Math.round((ev.clientX - rect.left - doc.view.panX) / doc.view.zoom) : textDraft.imgX;
			const imgY = doc ? Math.round((ev.clientY - rect.top - doc.view.panY) / doc.view.zoom) : textDraft.imgY;
			textDraft.imgX = imgX;
			textDraft.imgY = imgY;
			if (doc) {
				const snapped = imageToScreen(doc.view, imgX, imgY);
				textDraft.sx = snapped.x;
				textDraft.sy = snapped.y;
			}
		};
		const up = () => {
			nub.removeEventListener('pointermove', move as EventListener);
			nub.removeEventListener('pointerup', up);
			nub.removeEventListener('pointercancel', up);
			// refocus so typing can continue right away
			requestAnimationFrame(() => textAreaEl?.focus());
		};
		nub.addEventListener('pointermove', move as EventListener);
		nub.addEventListener('pointerup', up);
		nub.addEventListener('pointercancel', up);
	}

	// gradient-fill draft: the first drag draws the gradient line; after
	// release only the 2 end nubs stay (the line itself is not drawn).
	// A click elsewhere commits the open gradient first. Right-button drag
	// swaps foreground/background.
	let gradientDraft = $state<{
		x0: number;
		y0: number;
		x1: number;
		y1: number;
		swap: boolean;
		drawing: boolean;
	} | null>(null);
	let gradientPointerId = -1;
	/** End index currently dragged via the forgiving canvas grab (or div). */
	let gradientNubDrag: 0 | 1 | null = null;

	function cancelGradientDraft(): void {
		clearGradientPreview();
		gradientDraft = null;
		gradientPointerId = -1;
		gradientNubDrag = null;
	}

	// Live gradient preview (Paint.NET shows the gradient while editing):
	// rebuilt rAF-throttled into a preview surface instead of the layer.
	let gradientPreviewId: string | null = $state(null);
	let gradientPreviewQueued = false;

	function clearGradientPreview(): void {
		gradientPreviewQueued = false;
		if (!gradientPreviewId) return;
		const id = gradientPreviewId;
		gradientPreviewId = null;
		if (!ready) return;
		try {
			const renderer = getEditorRenderer();
			// Detach first: the overlay must never reference a freed surface.
			renderer.setActiveFloating(null);
			if (renderer.surfaces.has(id)) renderer.surfaces.dispose(id);
		} catch {
			/* ignore */
		}
	}

	function queueGradientPreview(): void {
		if (!gradientDraft || !ready || !documentRegistry.active) return;
		if (gradientPreviewQueued) return;
		gradientPreviewQueued = true;
		const docId = documentRegistry.active.id;
		requestAnimationFrame(() => {
			gradientPreviewQueued = false;
			// The document may have closed/switched while queued — never
			// render a preview onto a stale scene.
			if (documentRegistry.active?.id !== docId) {
				clearGradientPreview();
				return;
			}
			renderGradientPreview();
		});
	}

	function renderGradientPreview(): void {
		const draft = gradientDraft;
		const doc = documentRegistry.active;
		if (!draft || !doc || !ready) {
			clearGradientPreview();
			return;
		}
		try {
			const renderer = getEditorRenderer();
			const fg = get(foregroundColor);
			const bg = get(backgroundColor);
			const layer = doc.activeLayer;
			if (!layer || !renderer.surfaces.has(layer.surfaceId)) {
				clearGradientPreview();
				return;
			}
			const id = buildGradientSurface(renderer, doc, layer.surfaceId, {
				x0: draft.x0,
				y0: draft.y0,
				x1: draft.x1,
				y1: draft.y1,
				mode: get(gradientMode),
				repeat: get(gradientRepeat),
				from: draft.swap ? bg : fg,
				to: draft.swap ? fg : bg
			});
			const old = gradientPreviewId;
			gradientPreviewId = id;
			// Dedicated overlay sprite (above layers, below ants) — the layer
			// sprites are never touched, so a freed preview can never dangle.
			if (id) renderer.setActiveFloating(renderer.surfaces.getTexture(id), 0, 0);
			else renderer.setActiveFloating(null);
			if (old && renderer.surfaces.has(old)) renderer.surfaces.dispose(old);
		} catch {
			clearGradientPreview();
		}
	}

	// Live-update the preview when gradient inputs change mid-edit.
	// NOTE: plain get() does NOT subscribe (one-shot read) — the real
	// subscriptions live in attach() below.

	function finishGradientDraft(): void {
		const draft = gradientDraft;
		gradientDraft = null;
		gradientPointerId = -1;
		gradientNubDrag = null;
		clearGradientPreview();
		if (!draft) return;
		const doc = documentRegistry.active;
		if (!doc) return;
		const fg = get(foregroundColor);
		const bg = get(backgroundColor);
		if (Math.round(fg.a) <= 0 && Math.round(bg.a) <= 0) {
			showNotice('Gradient colours are fully transparent.', 'error');
			return;
		}
		try {
			console.info(
				'[gradient]',
				`line=(${Math.round(draft.x0)},${Math.round(draft.y0)})→(${Math.round(draft.x1)},${Math.round(draft.y1)})`,
				`mode=${get(gradientMode)} repeat=${get(gradientRepeat)} swap=${draft.swap}`,
				`from=(${fg.r},${fg.g},${fg.b},${fg.a}) to=(${bg.r},${bg.g},${bg.b},${bg.a})`
			);
			const ok = commitGradientToLayer(getEditorRenderer(), doc, {
				x0: draft.x0,
				y0: draft.y0,
				x1: draft.x1,
				y1: draft.y1,
				mode: get(gradientMode),
				repeat: get(gradientRepeat),
				from: draft.swap ? bg : fg,
				to: draft.swap ? fg : bg
			});
			if (!ok) showNotice('Could not draw gradient.', 'error');
		} catch (err) {
			console.error('[gradient] commit failed', err);
			showNotice('Could not draw gradient.', 'error');
		}
	}

	/** Drags one of the 2 gradient-line ends (same capture pattern as nubs). */
	function onGradientNubDown(e: PointerEvent, i: 0 | 1): void {
		if (!gradientDraft) return;
		e.preventDefault();
		e.stopPropagation();
		const nub = e.currentTarget as HTMLElement;
		capturePointer(e, nub);
		// The host pointer handlers perform the move (same as a near-canvas
		// grab) — no element listeners, so nothing can leak.
		gradientNubDrag = i;
		gradientPointerId = e.pointerId;
		console.info('[gradient]', `grab end ${i}`);
	}

	// OS pointer over the canvas: crosshair (the system "plus" cursor) while a
	// paint tool OR a selection tool is armed and NOT painting; fully hidden
	// while painting (only the preview ring + painted stroke are visible, like
	// Paint.NET). The brush preview ring itself only ever shows for paint tools.
	const cursorCss = $derived.by(() => {
		if (panning) return 'cursor: grabbing;';
		if (panArmed) return pointerInside ? 'cursor: grab;' : '';
		if (zoomArmed) {
			if (!pointerInside) return '';
			return zoomRightHeld ? 'cursor: zoom-out;' : 'cursor: zoom-in;';
		}
		if (painting && !isPencil()) return 'cursor: none;';
		if ((cloning || recoloring) && pointerInside) return 'cursor: none;';
		if (get(activeToolId) === 'text') return pointerInside ? 'cursor: text;' : '';
		if (moving) return 'cursor: move;';
		if (moveArmed) {
			if (!pointerInside) return '';
			const img = imageFromScreen({ x: pointerX, y: pointerY });
			if (transformHandleAt(img) === 'rotate') {
				return rotateCursor(moveEngine?.transformState?.pivot ?? transformUi?.pivot, img);
			}
			return moveEngine?.floating && moveEngine.pointInSelection(img) ? 'cursor: default;' : 'cursor: move;';
		}
		if (moveSelArmed) {
			if (!pointerInside) return '';
			const img = imageFromScreen({ x: pointerX, y: pointerY });
			const handle = transformHandleAt(img);
			if (handle === 'rotate') {
				return rotateCursor(moveSelEngine?.transformState?.pivot ?? transformUi?.pivot, img);
			}
			if (handle === 'nw' || handle === 'se') return 'cursor: nwse-resize;';
			if (handle === 'ne' || handle === 'sw') return 'cursor: nesw-resize;';
			if (handle === 'n' || handle === 's') return 'cursor: ns-resize;';
			if (handle === 'e' || handle === 'w') return 'cursor: ew-resize;';
			if (handle === 'pivot') return 'cursor: crosshair;';
			return pointInTransformSelection(img, moveSelEngine?.transformState ?? transformUi) ? 'cursor: move;' : 'cursor: default;';
		}
		if (!(paintArmed || cloneArmed || recolorArmed || selectionArmed || get(activeToolId) === 'bucket' || get(activeToolId) === 'wand' || get(activeToolId) === 'shape' || get(activeToolId) === 'line' || get(activeToolId) === 'gradient'))
			return '';
		return pointerInside ? 'cursor: crosshair;' : '';
	});

	function screenPoint(e: { clientX: number; clientY: number }) {
		const rect = host.getBoundingClientRect();
		return { x: e.clientX - rect.left, y: e.clientY - rect.top };
	}

	function capturePointer(e: PointerEvent, element: HTMLElement = host): void {
		try {
			element.setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function rotateCursor(pivot: Point | undefined, img: Point): string {
		const cursor = pivot && img.x < pivot.x ? rotateCounterclockwiseCursor : rotateClockwiseCursor;
		return `cursor: url("${cursor}") 12 12, grab;`;
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
		panArmed = get(activeToolId) === 'pan' && hasDoc;
		const wasZoomArmed = zoomArmed;
		zoomArmed = get(activeToolId) === 'zoom' && hasDoc;
		if (!zoomArmed && wasZoomArmed) zoomRightHeld = false;
		paintArmed = PAINT_TOOLS.has(get(activeToolId)) && hasDoc;
		cloneArmed = get(activeToolId) === 'clone-stamp' && hasDoc;
		recolorArmed = get(activeToolId) === 'recolor' && hasDoc;
		selectionArmed = SELECT_TOOLS.has(get(activeToolId)) && hasDoc;
		moveArmed = get(activeToolId) === 'move-pixels' && hasDoc;
		moveSelArmed = get(activeToolId) === 'move-selection' && hasDoc;
		syncTransformUi();
		if (ready) getEditorRenderer().setTransformHandlesVisible(moveArmed);
		refreshRing();
		// Switching away from the text tool commits the open draft (Paint.NET).
		if (get(activeToolId) !== 'text' && textDraft) commitTextDraft();
		// Switching away from the shapes tool cancels the open draft (Paint.NET
		// paints nothing until release).
		if (get(activeToolId) !== 'shape' && shapeDraft) cancelShapeDraft();
		// Same for the line tool's editable draft.
		if (get(activeToolId) !== 'line' && lineDraft) cancelLineDraft();
		// Same for the gradient line draft.
		if (get(activeToolId) !== 'gradient' && gradientDraft) cancelGradientDraft();
		// An interrupted clone/recolor stroke is discarded on tool switch.
		if (cloning && get(activeToolId) !== 'clone-stamp') {
			cloneEngine?.cancel();
			cloning = false;
			clonePointerId = -1;
		}
		if (recoloring && get(activeToolId) !== 'recolor') {
			recolorEngine?.cancel();
			recoloring = false;
			recolorPointerId = -1;
		}
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

	/** Recomputes the ring radius from the active dab size and the current zoom
	 * (zooming changes the on-screen size of the brush preview). */
	function refreshRing(): void {
		const doc = documentRegistry.active;
		const tool = get(activeToolId);
		const size = tool === 'clone-stamp' ? get(cloneSize) : tool === 'recolor' ? get(recolorSize) : get(brushSize);
		ringR = (paintArmed || cloneArmed || recolorArmed) && doc ? (size / 2) * doc.view.zoom : 0;
	}

	/** Moves the brush preview to the pointer position. */
	function movePointer(sp: { x: number; y: number }): void {
		pointerX = sp.x;
		pointerY = sp.y;
		refreshRing();
	}

	const canvasInput: KeyApi & PointerApi & PointerDownApi = {
		// gesture flags
		gradientDraft: () => !!gradientDraft,
		gradientDrawing: () => !!gradientDraft?.drawing,
		setGradientDrawing: (v: boolean) => {
			if (gradientDraft) gradientDraft.drawing = v;
		},
		lineDraft: () => !!lineDraft,
		lineDrawing: () => !!lineDraft?.drawing,
		setLineDrawing: (v: boolean) => {
			if (lineDraft) lineDraft.drawing = v;
		},
		shapeDraft: () => !!shapeDraft,
		selecting: () => selecting,
		setSelecting: (v: boolean) => {
			selecting = v;
		},
		polyBuilding: () => polyBuilding,
		moveFloating: () => !!moveEngine?.floating,
		moveSelDragging: () => !!moveSelEngine?.dragging,
		spaceHeld: () => spaceHeld,
		setSpaceHeld: (v: boolean) => {
			spaceHeld = v;
		},
		// pointer-gesture flags + ids
		zoomRightHeld: () => zoomRightHeld,
		setZoomRightHeld: (v: boolean) => {
			zoomRightHeld = v;
		},
		cloning: () => cloning,
		setCloning: (v: boolean) => {
			cloning = v;
		},
		clonePointerId: () => clonePointerId,
		setClonePointerId: (v: number) => {
			clonePointerId = v;
		},
		recoloring: () => recoloring,
		setRecoloring: (v: boolean) => {
			recoloring = v;
		},
		recolorPointerId: () => recolorPointerId,
		setRecolorPointerId: (v: number) => {
			recolorPointerId = v;
		},
		linePointerId: () => linePointerId,
		lineNubDrag: () => lineNubDrag,
		setLineNubDrag: (v: 0 | 1 | 2 | 3 | null) => {
			lineNubDrag = v;
		},
		gradientPointerId: () => gradientPointerId,
		gradientNubDrag: () => gradientNubDrag,
		setGradientNubDrag: (v: 0 | 1 | null) => {
			gradientNubDrag = v;
		},
		shapePointerId: () => shapePointerId,
		painting: () => painting,
		setPainting: (v: boolean) => {
			painting = v;
		},
		paintPointerId: () => paintPointerId,
		setPaintPointerId: (v: number) => {
			paintPointerId = v;
		},
		moving: () => moving,
		setMoving: (v: boolean) => {
			moving = v;
		},
		movePointerId: () => movePointerId,
		setMovePointerId: (v: number) => {
			movePointerId = v;
		},
		movingSelection: () => movingSelection,
		setMovingSelection: (v: boolean) => {
			movingSelection = v;
		},
		moveSelPointerId: () => moveSelPointerId,
		setMoveSelPointerId: (v: number) => {
			moveSelPointerId = v;
		},
		clearTransformHandle: () => {
			transformHandle = null;
		},
		panning: () => panning,
		setPanning: (v: boolean) => {
			panning = v;
		},
		panPointerId: () => panPointerId,
		setPanPointerId: (v: number) => {
			panPointerId = v;
		},
		selectPointerId: () => selectPointerId,
		setSelectPointerId: (v: number) => {
			selectPointerId = v;
		},
		selStart: () => selStart,
		setSelStart: (v: Point | null) => {
			selStart = v;
		},
		lassoPts: () => lassoPts,
		setLassoPts: (v: Point[]) => {
			lassoPts = v;
		},
		selDownClient: () => selDownClient,
		dragMode: () => dragMode,
		ready: () => ready,
		textDraft: () => !!textDraft,
		getLastTransformClick: () => lastTransformClick,
		setPanStart: (v: Point) => {
			panStart = v;
		},
		setPanStartView: (v: { panX: number; panY: number }) => {
			panStartView = v;
		},
		setSelDownClient: (v: Point) => {
			selDownClient = v;
		},
		setDragMode: (v: 'replace' | 'add' | 'subtract') => {
			dragMode = v;
		},
		setTransformHandle: (v: TransformHandle | null) => {
			transformHandle = v;
		},
		setLastTransformClick: (v: { handle: TransformHandle | null; time: number }) => {
			lastTransformClick = v;
		},
		setShapeDraft: (v: ShapeDraftState | null) => {
			shapeDraft = v;
		},
		setShapePointerId: (v: number) => {
			shapePointerId = v;
		},
		setLineDraft: (v: LineDraftState | null) => {
			lineDraft = v;
		},
		setLinePointerId: (v: number) => {
			linePointerId = v;
		},
		setGradientDraft: (v: GradientDraftState | null) => {
			gradientDraft = v;
		},
		setGradientPointerId: (v: number) => {
			gradientPointerId = v;
		},
		// engines
		cloneEngine: () => cloneEngine,
		recolorEngine: () => recolorEngine,
		brushEngine: () => engine,
		moveEngine: () => moveEngine,
		moveSelEngine: () => moveSelEngine,
		setCloneEngine: (v: CloneEngine | null) => {
			cloneEngine = v;
		},
		setRecolorEngine: (v: RecolorEngine | null) => {
			recolorEngine = v;
		},
		setBrushEngine: (v: BrushEngine | null) => {
			engine = v;
		},
		setMoveEngine: (v: MoveEngine | null) => {
			moveEngine = v;
		},
		setMoveSelEngine: (v: MoveSelectionEngine | null) => {
			moveSelEngine = v;
		},
		// conversion / capture / actions
		toImage: (pe: PointerEvent) => pointerToImage(pe),
		toScreen: (pe: { clientX: number; clientY: number }) => screenPoint(pe),
		capture: (e: PointerEvent) => capturePointer(e),
		release: (id: number) => {
			try {
				host.releasePointerCapture(id);
			} catch {
				/* ignore */
			}
		},
		movePointer,
		updateStatus,
		refreshRing,
		commitTextDraft,
		openTextDraft,
		polyClick,
		transformHandleAt,
		beginTransformDrag,
		resetPivotToCenter,
		startMoveDrag,
		lineNubPoint: (i: number) => {
			const doc = documentRegistry.active;
			if (!doc || !lineDraft) return { x: 0, y: 0 };
			const p = [lineDraft.p0, lineDraft.p1, lineDraft.p2, lineDraft.p3][i];
			return imageToScreen(doc.view, p.x, p.y);
		},
		gradientEndPoint: (i: number) => {
			const doc = documentRegistry.active;
			if (!doc || !gradientDraft) return { x: 0, y: 0 };
			return i === 0
				? imageToScreen(doc.view, gradientDraft.x0, gradientDraft.y0)
				: imageToScreen(doc.view, gradientDraft.x1, gradientDraft.y1);
		},
		finishShapeDraft,
		cancelShapeDraft,
		cancelLineDraft,
		cancelGradientDraft,
		cancelSelectDrag,
		syncTransformUi,
		cancelPolygon,
		finishPolygon,
		finishLineDraft,
		finishGradientDraft,
		dropMove: () => moveEngine?.drop(),
		cancelMove: () => {
			moveEngine?.cancel();
			moving = false;
			movePointerId = -1;
		},
		cancelMoveSelection: () => {
			moveSelEngine?.cancel();
			movingSelection = false;
			moveSelPointerId = -1;
		},
		// Arrow keys: nudge a floating selection first (whatever lifted it),
		// else the selection itself when a move tool is active.
		nudgeSelection: (dx: number, dy: number) => {
			const doc = documentRegistry.active;
			if (!doc || !ready || !doc.selection.active) return;
			if (moveEngine?.floating) {
				moveEngine.nudge(dx, dy);
				syncTransformUi();
				return;
			}
			const tool = get(activeToolId);
			if (tool === 'move-pixels') {
				if (!moveEngine) {
					moveEngine = new MoveEngine(getEditorRenderer());
					moveEngine.setMode(get(moveToolMode));
				}
				moveEngine.nudge(dx, dy);
				syncTransformUi();
				return;
			}
			if (tool === 'move-selection') {
				if (!moveSelEngine) moveSelEngine = new MoveSelectionEngine(getEditorRenderer());
				moveSelEngine.nudge(dx, dy);
				syncTransformUi();
			}
		}
	};

	function onKeyDown(e: KeyboardEvent) {
		handleKeyDown(e, canvasInput);
	}
	function onKeyUp(e: KeyboardEvent) {
		handleKeyUp(e, canvasInput);
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		// Zooming would orphan the text-draft overlay — commit it first.
		if (textDraft) commitTextDraft();
		// A shape draft is view-dependent too — cancel it (nothing painted yet).
		if (shapeDraft) cancelShapeDraft();
		if (lineDraft) cancelLineDraft();
		if (gradientDraft) cancelGradientDraft();
		const doc = documentRegistry.active;
		if (!doc || !ready) return;
		const renderer = getEditorRenderer();
		const anchor = screenPoint(e);
		const factor = Math.exp(-e.deltaY * 0.0015);
		doc.view = zoomBy(doc.view, anchor, factor);
		renderer.refreshActiveView();
		syncTransformUi();
		updateStatus(doc);
		refreshRing(); // zoom changed the on-screen brush size
	}

	function imageFromScreen(sp: { x: number; y: number }): { x: number; y: number } {
		const doc = documentRegistry.active!;
		return screenToImage(doc.view, sp.x, sp.y);
	}

	/** Pointer event → image-pixel coordinates (host-relative client point). */
	function pointerToImage(e: PointerEvent): { x: number; y: number } {
		return imageFromScreen(screenPoint(e));
	}

	// --- selection tools (rect / ellipse / lasso) -------------------------

	/** Live draft outline (solid) for the drag in progress. `cur` is the
	 * current pointer position in image px. */
	function showSelectDraft(cur: Point): void {
		if (!ready) return;
		const kind = selectionToolKind();
		const start = selStart ? clampSelectionPoint(selStart) : null;
		const boundedCur = clampSelectionPoint(cur);
		if (!kind || !start) return;
		if (kind === 'lasso') {
			const boundedPoints = lassoPts.map(clampSelectionPoint);
			if (boundedPoints.length >= 2) {
				const xs = boundedPoints.map((p) => p.x);
				const ys = boundedPoints.map((p) => p.y);
				statusBar.update((s) => ({
					...s,
					selW: Math.round(Math.max(...xs) - Math.min(...xs)),
					selH: Math.round(Math.max(...ys) - Math.min(...ys))
				}));
				getEditorRenderer().previewSelectionOutline([boundedPoints], false);
			} else {
				statusBar.update((s) => ({ ...s, selW: 0, selH: 0 }));
				getEditorRenderer().previewSelectionOutline(null, false);
			}
			return;
		}
		// rect/ellipse: outline follows the current pointer position (rectangle
		// tool honours the Free/Fixed-Ratio/Fixed-Size mode; Fixed Size moves a
		// free-floating box with its top-left under the pointer).
		let rect: Rect;
		if (kind === 'rect' && get(selectionRatio) === 'fixedSize') {
			rect = fixedRectAt(boundedCur);
		} else {
			const eff = kind === 'rect' ? constrainRectCorner(start, boundedCur) : boundedCur;
			rect = {
				x: Math.min(start.x, eff.x),
				y: Math.min(start.y, eff.y),
				width: Math.abs(eff.x - start.x),
				height: Math.abs(eff.y - start.y)
			};
		}
		statusBar.update((s) => ({ ...s, selW: Math.round(rect.width), selH: Math.round(rect.height) }));
		const loop = selectionOutlinePoints(kind, rect, null);
		getEditorRenderer().previewSelectionOutline(loop.length ? [loop] : null, false);
	}

	/** Aborts a selection drag and restores the committed ants (if any). */
	function cancelSelectDrag(): void {
		selecting = false;
		selectPointerId = -1;
		selStart = null;
		lassoPts = [];
		statusBar.update((s) => ({ ...s, selW: null, selH: null }));
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
		const img = pointerToImage(e);
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
		capturePointer(e);
	}

	function transformHandleAt(img: Point): TransformHandle | null {
		const activeTool = get(activeToolId);
		const t = activeTool === 'move-selection'
			? moveSelEngine?.transformState ?? transformUi
			: moveEngine?.transformState ?? transformUi;
		const doc = documentRegistry.active;
		if (!t || !doc) return null;
		const b = t.bounds;
		const threshold = 10 / Math.max(doc.view.zoom, 0.01);
		const state = {
			pivot: t.pivot,
			offset: t.offset,
			scaleX: t.scaleX,
			scaleY: t.scaleY,
			rotation: t.rotation,
			skewX: (t as { skewX?: number }).skewX ?? 0,
			skewY: (t as { skewY?: number }).skewY ?? 0
		};
		const transformed = (x: number, y: number): Point => affinePoint(state, { x, y });
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

	function pointInTransformSelection(img: Point, t: TransformUiState | null): boolean {
		if (!t) return false;
		const b = t.bounds;
		const corners = [
			affinePoint(
				{ pivot: t.pivot, offset: t.offset, scaleX: t.scaleX, scaleY: t.scaleY, rotation: t.rotation, skewX: t.skewX ?? 0, skewY: t.skewY ?? 0 },
				{ x: b.x, y: b.y }
			),
			affinePoint(
				{ pivot: t.pivot, offset: t.offset, scaleX: t.scaleX, scaleY: t.scaleY, rotation: t.rotation, skewX: t.skewX ?? 0, skewY: t.skewY ?? 0 },
				{ x: b.x + b.width, y: b.y }
			),
			affinePoint(
				{ pivot: t.pivot, offset: t.offset, scaleX: t.scaleX, scaleY: t.scaleY, rotation: t.rotation, skewX: t.skewX ?? 0, skewY: t.skewY ?? 0 },
				{ x: b.x + b.width, y: b.y + b.height }
			),
			affinePoint(
				{ pivot: t.pivot, offset: t.offset, scaleX: t.scaleX, scaleY: t.scaleY, rotation: t.rotation, skewX: t.skewX ?? 0, skewY: t.skewY ?? 0 },
				{ x: b.x, y: b.y + b.height }
			)
		];
		return pointInPolygon(img, corners);
	}

	function logTransformCursor(img: Point): void {
		const t = moveEngine?.transformState ?? transformUi;
		const doc = documentRegistry.active;
		if (!t || !doc || (get(activeToolId) !== 'move-pixels' && get(activeToolId) !== 'move-selection')) return;
		const b = t.bounds;
		const state = {
			pivot: t.pivot,
			offset: t.offset,
			scaleX: t.scaleX,
			scaleY: t.scaleY,
			rotation: t.rotation,
			skewX: (t as { skewX?: number }).skewX ?? 0,
			skewY: (t as { skewY?: number }).skewY ?? 0
		};
		const point = (x: number, y: number): Point => affinePoint(state, { x, y });
		const pivot = { x: t.pivot.x + t.offset.x, y: t.pivot.y + t.offset.y };
		const corners = [point(b.x, b.y), point(b.x + b.width, b.y), point(b.x + b.width, b.y + b.height), point(b.x, b.y + b.height)];
		const outside = !pointInPolygon(img, corners);
		const debugEntry = {
			mouse: img,
			selection: { bounds: b, pivot, offset: t.offset, scaleX: t.scaleX, scaleY: t.scaleY, rotation: t.rotation },
			corners,
			outside,
			handle: transformHandleAt(img)
		};
		console.log('[transform-cursor]', debugEntry);
		const signature = JSON.stringify({
			handle: debugEntry.handle,
			outside: debugEntry.outside,
			mouse: { x: Math.round(img.x), y: Math.round(img.y) }
		});
		if (signature !== lastTransformCursorDebug) {
			lastTransformCursorDebug = signature;
			logTransformDebug('cursor', debugEntry);
		}
	}

	function beginTransformDrag(e: PointerEvent, img: Point, handle: TransformHandle): void {
		if (get(activeToolId) === 'move-selection') {
			if (!moveSelEngine) return;
			moveSelEngine.beginTransform(handle, img);
		} else {
			if (!moveEngine) return;
			moveEngine.beginTransform(handle, img);
		}
		transformHandle = handle;
		moving = true;
		movePointerId = e.pointerId;
		capturePointer(e);
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
		handlePointerDown(e, canvasInput);
	}

	function onPointerMove(e: PointerEvent) {
		const sp = screenPoint(e);
		const doc = documentRegistry.active;
		if (ready && doc) {
			logTransformCursor(imageFromScreen(sp));
			if (polyBuilding && isPolyTool() && !panning) {
				showPolyOutline(imageFromScreen(sp)); // live polygon preview follows the pointer
			}
			if (panning && e.pointerId === panPointerId) {
				doc.view.panX = panStartView.panX + (e.clientX - panStart.x);
				doc.view.panY = panStartView.panY + (e.clientY - panStart.y);
				getEditorRenderer().refreshActiveView();
				syncTransformUi();
				return;
			}
			if (shapeDraft && e.pointerId === shapePointerId) {
				const img = imageFromScreen(sp);
				shapeDraft.curX = img.x;
				shapeDraft.curY = img.y;
			}
			if (lineDraft?.drawing && e.pointerId === linePointerId) {
				const img = imageFromScreen(sp);
				lineDraft.p3 = { x: img.x, y: img.y };
				const [c1, c2] = straightLineControls(lineDraft.p0, lineDraft.p3);
				lineDraft.p1 = c1;
				lineDraft.p2 = c2;
			}
			if (lineDraft && lineNubDrag !== null && e.pointerId === linePointerId) {
				const img = imageFromScreen(sp);
				const key = (['p0', 'p1', 'p2', 'p3'] as const)[lineNubDrag];
				lineDraft[key] = { x: img.x, y: img.y };
			}
			if (gradientDraft?.drawing && e.pointerId === gradientPointerId) {
				const img = imageFromScreen(sp);
				gradientDraft.x1 = img.x;
				gradientDraft.y1 = img.y;
				queueGradientPreview();
			}
			if (gradientDraft && gradientNubDrag !== null && e.pointerId === gradientPointerId) {
				const img = imageFromScreen(sp);
				if (gradientNubDrag === 0) {
					gradientDraft.x0 = img.x;
					gradientDraft.y0 = img.y;
				} else {
					gradientDraft.x1 = img.x;
					gradientDraft.y1 = img.y;
				}
				queueGradientPreview();
			}
			if (cloning && e.pointerId === clonePointerId && cloneEngine) {
				cloneEngine.lineTo(imageFromScreen(sp));
			}
			if (recoloring && e.pointerId === recolorPointerId && recolorEngine) {
				recolorEngine.lineTo(imageFromScreen(sp));
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
				if (transformHandle) moveSelEngine.transformTo(imageFromScreen(sp), e.shiftKey);
				else moveSelEngine.moveTo(imageFromScreen(sp));
				syncTransformUi();
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
		handleEndPointer(e, canvasInput);
	}

	function cancelPointer(e: PointerEvent) {
		handleCancelPointer(e, canvasInput);
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
		let sessionHandle: SessionPersistence | null = null;

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
					updateStatus(documentRegistry.active);
					syncTransformUi();
				})
			);
			const unTool = activeToolId.subscribe((tool) => {
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
			// Text-tool options strip → commit/cancel requests.
			const unText = textAction.subscribe((a) => {
				if (!a) return;
				if (a === 'commit') void commitTextDraft();
				else cancelTextDraft();
				textAction.set(null);
			});
			// Line-tool options strip → commit/cancel requests.
			const unLine = lineAction.subscribe((a) => {
				if (!a) return;
				if (a === 'commit') finishLineDraft();
				else cancelLineDraft();
				lineAction.set(null);
			});
			// Gradient options strip → commit/cancel requests.
			const unGradient = gradientAction.subscribe((a) => {
				if (!a) return;
				if (a === 'commit') finishGradientDraft();
				else cancelGradientDraft();
				gradientAction.set(null);
			});
			// Gradient inputs (mode, repeat, colours) live-update the preview
			// mid-edit (get() alone would not subscribe).
			const unGradientLive = [gradientMode, gradientRepeat, foregroundColor, backgroundColor].map((store) =>
				store.subscribe(() => {
					if (gradientDraft) queueGradientPreview();
				})
			);
			// Move sub-mode (move / rotate / distort) → move engine (also
			// applied when the engine is created later).
			const unMoveMode = moveToolMode.subscribe((v) => moveEngine?.setMode(v));
			disposers.push(unTool, unSize, unPoly, unText, unLine, unGradient, ...unGradientLive, unMoveMode);

			const onEnter = () => {
				pointerInside = true;
				syncTransformUi();
			};
			const onLeave = () => {
				pointerInside = false;
				zoomRightHeld = false;
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
			applyCheckerTheme();
		};

		void initEditorRenderer(canvasEl).then(() => {
			if (!alive) return;
			attach();
			sessionHandle = startSessionPersistence();
			void restoreSession();
		});

		return () => {
			alive = false;
			sessionHandle?.stop();
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
	{#if shapeDraft && documentRegistry.active}
		{@const act = documentRegistry.active}
		<ShapePreview draft={shapeDraft} view={act.view} />
	{/if}
	{#if textDraft}
		{@const td = textDraft}
		<div
			class="text-nub absolute z-40"
			style="left:{td.sx - 5}px; top:{td.sy - 5}px;"
			title="Drag to move the text"
			onpointerdown={onTextNubDown}
		></div>
		<textarea
			bind:this={textAreaEl}
			bind:value={textValue}
			class="text-draft select-text absolute z-30"
			style="left:{td.sx}px; top:{td.sy}px; color:{rgbaToCss($foregroundColor)}; font-family:'{$textFontFamily}', sans-serif; font-size:{$textFontSize * td.zoom}px; font-weight:{$textBold ? 'bold' : 'normal'}; font-style:{$textItalic ? 'italic' : 'normal'}; text-align:{$textAlign}; text-decoration:{$textUnderline && $textStrike ? 'underline line-through' : $textUnderline ? 'underline' : $textStrike ? 'line-through' : 'none'}; line-height:1;"
			rows={1}
			spellcheck={false}
			placeholder="Type here…"
			oninput={(e) => {
				// Free typing: grow with the content instead of jailing it in a
				// fixed box (width follows the longest line, height the lines).
				const el = e.currentTarget as HTMLTextAreaElement;
				el.style.height = 'auto';
				el.style.height = `${el.scrollHeight}px`;
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					e.preventDefault();
					e.stopPropagation();
					cancelTextDraft();
				} else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
					e.preventDefault();
					e.stopPropagation();
					commitTextDraft();
				} else {
					e.stopPropagation();
				}
			}}
		></textarea>
	{/if}
	{#if lineDraft && documentRegistry.active}
		{@const act = documentRegistry.active}
		{@const ld = lineDraft}
		{@const lq0 = imageToScreen(act.view, ld.p0.x, ld.p0.y)}
		{@const lq1 = imageToScreen(act.view, ld.p1.x, ld.p1.y)}
		{@const lq2 = imageToScreen(act.view, ld.p2.x, ld.p2.y)}
		{@const lq3 = imageToScreen(act.view, ld.p3.x, ld.p3.y)}
		<LinePreview draft={lineDraft} view={act.view} />
		{#each [lq0, lq1, lq2, lq3] as q, i (i)}
			<div
				class="line-nub absolute z-40"
				class:line-ctrl={i === 1 || i === 2}
				style="left:{q.x - 7}px; top:{q.y - 7}px;"
				title={i === 0 ? 'Start point' : i === 3 ? 'End point' : 'Control point'}
				onpointerdown={(e) => onLineNubDown(e, i as 0 | 1 | 2 | 3)}
			></div>
		{/each}
	{/if}
	{#if gradientDraft && documentRegistry.active}
		{@const gd = gradientDraft}
		{@const gdoc = documentRegistry.active}
		{@const gq0 = imageToScreen(gdoc.view, gd.x0, gd.y0)}
		{@const gq1 = imageToScreen(gdoc.view, gd.x1, gd.y1)}
		{#each [gq0, gq1] as q, i (i)}
			<div
				class="line-nub absolute z-40"
				style="left:{q.x - 7}px; top:{q.y - 7}px;"
				title={i === 0 ? 'Gradient start (foreground)' : 'Gradient end (background)'}
				onpointerdown={(e) => onGradientNubDown(e, i as 0 | 1)}
			></div>
		{/each}
	{/if}
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
