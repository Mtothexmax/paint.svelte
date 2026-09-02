<script lang="ts">
	// Layer: components -> hosts <canvas>, routes pointers to viewport pan/zoom and
	// to the active paint tool. No pixi symbols imported here.
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { documentRegistry, RegistryEvents } from '../../core/document/registry';
	import { screenToImage, zoomBy } from '../../render/Viewport';
	import { getEditorRenderer, initEditorRenderer } from '../../render/EditorRenderer';
	import { BrushEngine } from '../../render/BrushEngine';
	import { openFiles } from '../../services/fileService';
	import { dialog } from '../../services/dialogService';
	import { activeToolId, statusBar, brushSize, brushOpacity, brushHardness, foregroundColor } from '../../state/ui';

	const PAINT_TOOLS = new Set(['brush', 'pencil', 'eraser']);
	const KIND: Record<string, 'brush' | 'pencil' | 'eraser'> = {
		brush: 'brush',
		pencil: 'pencil',
		eraser: 'eraser'
	};

	let host: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;
	let ready = false;

	let spaceHeld = false;
	let panning = false;
	let panPointerId = -1;
	let panStart = { x: 0, y: 0 };
	let panStartView = { panX: 0, panY: 0 };

	// painting state
	let engine: BrushEngine | null = null;
	let painting = false;
	let paintPointerId = -1;

	// brush cursor ring
	let ringX = -100;
	let ringY = -100;
	let ringR = 0;
	let ringVisible = false;

	const isPaintTool = () => PAINT_TOOLS.has($activeToolId) && !!documentRegistry.active;

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

	function updateRing(sp: { x: number; y: number }, doc = documentRegistry.active) {
		if (PAINT_TOOLS.has($activeToolId) && doc) {
			ringX = sp.x;
			ringY = sp.y;
			ringR = (get(brushSize) / 2) * doc.view.zoom;
			ringVisible = true;
		} else {
			ringVisible = false;
		}
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
		// Undo / Redo — handled here directly (robust on every layout) so a
		// brush stroke can always be reverted with Ctrl+Z / Ctrl+Y.
		if (!typing && (e.ctrlKey || e.metaKey) && !e.altKey && !get(dialog).kind) {
			const doc = documentRegistry.active;
			if (doc) {
				const key = e.key.toLowerCase();
				if (key === 'z') {
					e.preventDefault();
					if (e.shiftKey) doc.history.redo();
					else doc.history.undo();
					documentRegistry.notifyChange(doc);
					return;
				}
				if (key === 'y') {
					e.preventDefault();
					doc.history.redo();
					documentRegistry.notifyChange(doc);
					return;
				}
			}
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
	}

	function imageFromScreen(sp: { x: number; y: number }): { x: number; y: number } {
		const doc = documentRegistry.active!;
		return screenToImage(doc.view, sp.x, sp.y);
	}

	function onPointerDown(e: PointerEvent) {
		if (!ready) return;
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
		if (e.button === 0 && isPaintTool()) {
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
			const fg = get(foregroundColor);
			engine.begin(
				{
					kind: KIND[$activeToolId] ?? 'brush',
					size: get(brushSize),
					opacity: get(brushOpacity) / 100,
					hardness: get(brushHardness) / 100,
					color: fg
				},
				img
			);
		}
	}

	function onPointerMove(e: PointerEvent) {
		const sp = screenPoint(e);
		const doc = documentRegistry.active;
		if (ready && doc) {
			if (panning && e.pointerId === panPointerId) {
				doc.view.panX = panStartView.panX + (e.clientX - panStart.x);
				doc.view.panY = panStartView.panY + (e.clientY - panStart.y);
				getEditorRenderer().refreshActiveView();
				return;
			}
			if (painting && e.pointerId === paintPointerId && engine) {
				engine.lineTo(imageFromScreen(sp));
			}
		}
		updateRing(sp, doc);
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
		if (panning && e.pointerId === panPointerId) {
			panning = false;
			panPointerId = -1;
			try {
				host.releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
		}
	}

	function cancelPointer(e: PointerEvent) {
		if (painting && e.pointerId === paintPointerId) {
			engine?.cancel();
			painting = false;
			paintPointerId = -1;
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

			disposers.push(documentRegistry.events.on(RegistryEvents.active, () => updateStatus(documentRegistry.active)));

			host.addEventListener('wheel', onWheel, { passive: false });
			host.addEventListener('pointerdown', onPointerDown);
			host.addEventListener('pointermove', onPointerMove);
			host.addEventListener('pointerup', endPointer);
			host.addEventListener('pointercancel', cancelPointer);
			host.addEventListener('dragover', onDragOver);
			host.addEventListener('drop', onDrop);
			window.addEventListener('keydown', onKeyDown, true);
			window.addEventListener('keyup', onKeyUp);
			disposers.push(() => {
				host.removeEventListener('wheel', onWheel);
				host.removeEventListener('pointerdown', onPointerDown);
				host.removeEventListener('pointermove', onPointerMove);
				host.removeEventListener('pointerup', endPointer);
				host.removeEventListener('pointercancel', cancelPointer);
				host.removeEventListener('dragover', onDragOver);
				host.removeEventListener('drop', onDrop);
				window.removeEventListener('keydown', onKeyDown, true);
				window.removeEventListener('keyup', onKeyUp);
			});

			updateStatus(documentRegistry.active);
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
	style="touch-action: none;"
>
	<canvas bind:this={canvasEl} class="absolute inset-0 block h-full w-full" style="touch-action:none;"></canvas>
	{#if ringVisible}
		<div
			class="pointer-events-none absolute z-10"
			style="left:{ringX - ringR}px; top:{ringY - ringR}px; width:{ringR * 2}px; height:{ringR * 2}px; border:1px solid rgba(255,255,255,0.9); border-radius:9999px; box-shadow:0 0 0 1px rgba(0,0,0,0.5);"
		></div>
	{/if}
</div>
