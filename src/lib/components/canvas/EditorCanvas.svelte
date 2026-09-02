<script lang="ts">
	// Layer: components -> owns <canvas> + pointer/viewport wiring. No pixi symbols imported.
	import { onMount } from 'svelte';
	import { documentRegistry, RegistryEvents } from '../../core/document/registry';
	import { screenToImage, zoomBy } from '../../render/Viewport';
	import { getEditorRenderer, initEditorRenderer } from '../../render/EditorRenderer';
	import { openFiles } from '../../services/fileService';
	import { statusBar } from '../../state/ui';

	let host: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;
	let ready = false;

	let spaceHeld = false;
	let panning = false;
	let panPointerId = -1;
	let panStart = { x: 0, y: 0 };
	let panStartView = { panX: 0, panY: 0 };

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

	function onKeyDown(e: KeyboardEvent) {
		if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
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
		const rect = host.getBoundingClientRect();
		const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		const factor = Math.exp(-e.deltaY * 0.0015);
		doc.view = zoomBy(doc.view, anchor, factor);
		renderer.refreshActiveView();
		updateStatus(doc);
	}

	function onPointerDown(e: PointerEvent) {
		if (!ready) return;
		const wantsPan = e.button === 1 || (e.button === 0 && spaceHeld);
		if (!wantsPan) return;
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
	}

	function onPointerMove(e: PointerEvent) {
		const doc = documentRegistry.active;
		if (!doc || !ready) return;
		if (panning && e.pointerId === panPointerId) {
			const dx = e.clientX - panStart.x;
			const dy = e.clientY - panStart.y;
			doc.view.panX = panStartView.panX + dx;
			doc.view.panY = panStartView.panY + dy;
			getEditorRenderer().refreshActiveView();
			return;
		}
		const rect = host.getBoundingClientRect();
		const image = screenToImage(doc.view, e.clientX - rect.left, e.clientY - rect.top);
		if (image.x >= 0 && image.y >= 0 && image.x < doc.width && image.y < doc.height) {
			updateStatus(doc, { x: image.x, y: image.y });
		} else {
			updateStatus(doc);
		}
	}

	function endPan(e: PointerEvent) {
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
			host.addEventListener('pointerup', endPan);
			host.addEventListener('pointercancel', endPan);
			host.addEventListener('dragover', onDragOver);
			host.addEventListener('drop', onDrop);
			window.addEventListener('keydown', onKeyDown);
			window.addEventListener('keyup', onKeyUp);
			disposers.push(() => {
				host.removeEventListener('wheel', onWheel);
				host.removeEventListener('pointerdown', onPointerDown);
				host.removeEventListener('pointermove', onPointerMove);
				host.removeEventListener('pointerup', endPan);
				host.removeEventListener('pointercancel', endPan);
				host.removeEventListener('dragover', onDragOver);
				host.removeEventListener('drop', onDrop);
				window.removeEventListener('keydown', onKeyDown);
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
</div>
