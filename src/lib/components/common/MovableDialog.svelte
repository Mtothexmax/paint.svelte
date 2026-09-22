<script lang="ts" module>
	import { takeDialogRightAnchor } from './dialogPosition';
	// Last dialog position, shared across mounts. Replacing a filter
	// remounts the popup (DialogHost keys by effect id) — restoring the
	// saved position keeps it where the user put it instead of
	// re-centering every time. Dimensions may still vary per filter.
	let savedPos: { x: number; y: number } | null = null;
</script>

<script lang="ts">
	import './MovableDialog.css';
	// Reusable MOVABLE popup (Paint.NET style): drag by the title bar, close
	// button, optional close via Esc. Non-modal → the canvas stays interactive.
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import CloseIcon from '@material-symbols/svg-400/rounded/close.svg';

	interface Props {
		title: string;
		onClose: () => void;
		width?: number;
		children: Snippet;
		actions?: Snippet;
		/** Optional control at the top-LEFT of the title bar (e.g. an
		 * FL-Studio-style ▾ menu button). Rendered before the title. */
		titleLeft?: Snippet;
		/** Optional controls at the top-RIGHT of the title bar (e.g. ‹ ›
		 * steppers). Rendered after the title, before the close button. */
		titleRight?: Snippet;
		/** Optional content at the LEFT of the footer (e.g. a Preview
		 * checkbox). Rendered before the actions, pushed left. */
		footerLeft?: Snippet;
	}
	let { title, onClose, width = 380, children, actions, titleLeft, titleRight, footerLeft }: Props = $props();

	let pos = $state(savedPos ?? { x: 120, y: 80 });
	let dragging = false;
	let dragOff = { x: 0, y: 0 };

	function beginDrag(e: PointerEvent) {
		// A control may live inside the title bar (the close button does).
		// Capturing the pointer on the title RETARGETS the follow-up `click` to
		// the title itself, so the control's own onclick never fires and the X
		// looks dead — while Cancel (in the footer, outside the capture) works.
		// Leave the gesture alone when it starts on an interactive element.
		if ((e.target as HTMLElement | null)?.closest('button, a, input, select, textarea')) return;
		dragging = true;
		dragOff = { x: e.clientX - pos.x, y: e.clientY - pos.y };
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
	}
	function moveDrag(e: PointerEvent) {
		if (!dragging) return;
		pos.x = Math.max(0, Math.min(e.clientX - dragOff.x, window.innerWidth - 60));
		pos.y = Math.max(0, Math.min(e.clientY - dragOff.y, window.innerHeight - 40));
		savedPos = { x: pos.x, y: pos.y };
	}
	function endDrag() {
		dragging = false;
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		// Dialog replacement (‹ › steppers / ▾ switcher): pin the TOP-RIGHT
		// corner — where the steppers live — instead of the top-left, so
		// the arrows stay put when the new window is wider/narrower.
		const anchorRight = takeDialogRightAnchor();
		if (anchorRight !== null && Number.isFinite(anchorRight)) {
			pos.x = Math.max(0, Math.min(anchorRight - width, window.innerWidth - 60));
			pos.y = savedPos
				? Math.max(0, Math.min(savedPos.y, window.innerHeight - 40))
				: Math.max(24, Math.round((window.innerHeight - 420) / 2));
			savedPos = { x: pos.x, y: pos.y };
			return;
		}
		if (!savedPos) {
			pos.x = Math.round((window.innerWidth - width) / 2);
			pos.y = Math.max(24, Math.round((window.innerHeight - 420) / 2));
		} else {
			// Restore last position, clamped into the current viewport
			// (the window may have shrunk since the drag).
			pos.x = Math.max(0, Math.min(savedPos.x, window.innerWidth - 60));
			pos.y = Math.max(0, Math.min(savedPos.y, window.innerHeight - 40));
		}
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
		{#if titleLeft}<span class="m-title-left">{@render titleLeft()}</span>{/if}
		<span class="m-title-text">{title}</span>
		{#if titleRight}<span class="m-title-right">{@render titleRight()}</span>{/if}
		<button class="m-close" title="Close" aria-label="Close" onclick={onClose}><img
				src={CloseIcon}
				class="m-btn-ic"
				alt=""
				draggable="false"
			/></button>
	</div>
	<div class="m-body">{@render children()}</div>
	<!-- The footer is skipped entirely when the dialog puts its own buttons in
	the body (e.g. the paste choice dialog) — an empty bar looks broken. -->
	{#if actions}
		<div class="m-footer">
			{#if footerLeft}<span class="m-footer-start">{@render footerLeft()}</span>{/if}
			{@render actions()}
		</div>
	{/if}
</div>
