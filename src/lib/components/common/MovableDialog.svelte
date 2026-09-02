<script lang="ts">
	// Reusable MOVABLE popup (Paint.NET style): drag by the title bar, close
	// button, optional close via Esc. Non-modal → the canvas stays interactive.
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	interface Props {
		title: string;
		onClose: () => void;
		width?: number;
		children: Snippet;
		actions?: Snippet;
	}
	let { title, onClose, width = 380, children, actions }: Props = $props();

	let pos = $state({ x: 120, y: 80 });
	let dragging = false;
	let dragOff = { x: 0, y: 0 };

	function beginDrag(e: PointerEvent) {
		dragging = true;
		dragOff = { x: e.clientX - pos.x, y: e.clientY - pos.y };
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
	}
	function moveDrag(e: PointerEvent) {
		if (!dragging) return;
		pos.x = Math.max(0, Math.min(e.clientX - dragOff.x, window.innerWidth - 60));
		pos.y = Math.max(0, Math.min(e.clientY - dragOff.y, window.innerHeight - 40));
	}
	function endDrag() {
		dragging = false;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		pos.x = Math.round((window.innerWidth - width) / 2);
		pos.y = Math.max(24, Math.round((window.innerHeight - 420) / 2));
	});
	$effect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});
</script>

<div
	class="m-dialog"
	style="left:{pos.x}px; top:{pos.y}px; width:{width}px;"
	role="dialog"
	aria-modal="false"
	aria-label={title}
>
	<div class="m-title" onpointerdown={beginDrag} onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag}>
		<span class="m-title-text">{title}</span>
		<button class="m-close" title="Close" onclick={onClose}>✕</button>
	</div>
	<div class="m-body">{@render children()}</div>
	<div class="m-footer">{@render actions?.()}</div>
</div>
