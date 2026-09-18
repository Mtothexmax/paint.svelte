<script lang="ts">
	import './EffectBrowserMenu.css';
	// Layer: components/common. Shared multi-column effect browser menu.
	// Same chrome in both apply paths — only the pick behavior differs:
	// - Layer Effects panel passes an onPick that adds a LIVE layer effect.
	// - MenuBar passes an onPick that runs the APPLIED (destructive) command.
	import { onMount } from 'svelte';
	import { effectMenusWithEntries } from '../../effects';

	import BlurIcon from '@material-symbols/svg-400/rounded/blur_on.svg';
	import DistortIcon from '@material-symbols/svg-400/rounded/transform.svg';
	import NoiseIcon from '@material-symbols/svg-400/rounded/noise_aware.svg';
	import ObjectIcon from '@material-symbols/svg-400/rounded/shapes.svg';
	import PhotoIcon from '@material-symbols/svg-400/rounded/photo_camera.svg';
	import RenderIcon from '@material-symbols/svg-400/rounded/landscape.svg';
	import StylizeIcon from '@material-symbols/svg-400/rounded/wand_stars.svg';

	interface Props {
		onPick: (effectId: string) => void;
		getLabel?: (effectId: string, fallback: string) => string;
		isEnabled?: (effectId: string) => boolean;
		getShortcut?: (effectId: string) => string | undefined;
		/** Element the menu is anchored to (e.g. the button that opened it).
		 * Used for the first-paint bounds before the menu itself is measured.
		 * Optional — falls back to the menu's own rect. */
		anchorEl?: HTMLElement | null;
		placement?: 'up' | 'down';
		ariaLabel?: string;
		/** Optional "Repeat …" row on top (MenuBar re-run of last effect). */
		repeatLabel?: string | null;
		onRepeat?: () => void;
	}

	let {
		onPick,
		getLabel,
		isEnabled,
		getShortcut,
		anchorEl = null,
		placement = 'up',
		ariaLabel = 'Choose effect',
		repeatLabel = null,
		onRepeat
	}: Props = $props();

	/** Measured viewport-fit bounds. Updated on open and on window resize so
	 * the menu never overflows the screen. */
	let maxWidth = $state(800);
	let maxHeight = $state(520);
	/** Column width derived from the widest header/item in the menu at open
	 * time (clamped to the menu's max-width). Keeps multi-column fluid and
	 * tight — no half-empty whitespace on either side of the labels. */
	let columnWidth = $state(220);
	/** Explicit menu width in px — sized to fit ALL columns (not just one)
	 * and capped by the viewport budget. `null` until measured (fallback
	 * `auto` renders narrow for a frame, which never overflows). */
	let fittedWidth: number | null = $state(null);
	/** False until the fitted width is applied. The menu stays
	 * `visibility: hidden` meanwhile (layout still runs, so measuring
	 * works) — otherwise it flashes at its wide `auto` size for a few ms
	 * before snapping down to the fitted width. */
	let ready = $state(false);
	let menuEl: HTMLDivElement | undefined = $state();

	/** Icons per menu category. Lower-cased label → SVG path. Unmatched
	 * categories fall back to a generic folder icon. */
	const MENU_ICONS: Record<string, string> = {
		blurs: BlurIcon,
		distort: DistortIcon,
		noise: NoiseIcon,
		object: ObjectIcon,
		photo: PhotoIcon,
		render: RenderIcon,
		stylize: StylizeIcon
	};

	/** Categories cannot be collapsed — they're always expanded. */

	function iconForMenu(label: string): string {
		return MENU_ICONS[label.toLowerCase()] ?? '';
	}

	/** Recompute the menu's max width/height so it never overflows the
	 * viewport. The width budget subtracts the menu's own viewport X offset
	 * — the menu is absolutely positioned at `left: 0` inside its anchor
	 * container, so capping by `viewport - margin` alone still overshoots
	 * by that offset. */
	function recomputeBounds() {
		if (typeof window === 'undefined') return;
		// Use `clientWidth` instead of `innerWidth` so a vertical scrollbar is
		// excluded — `100vw` includes the scrollbar, which used to make the
		// menu overshoot the visible viewport by a scrollbar-width or two.
		const vw = document.documentElement.clientWidth || window.innerWidth;
		const vh = document.documentElement.clientHeight || window.innerHeight;
		const marginRight = 12;
		const anchor = anchorEl?.getBoundingClientRect();
		const menuRect = menuEl?.getBoundingClientRect();
		// Fill the available vertical space (almost to the screen edge) —
		// no fixed px cap. Taller menu = fewer, roomier columns.
		// Budgets derive from the ANCHORED edge (stable as the menu grows):
		// bottom edge for 'up', top edge for 'down'. Never from the menu's
		// own far edge — that's where the content happens to end, which
		// would shrink-wrap the budget to the current (short) render.
		if (placement === 'up') {
			const top = anchor?.top ?? (menuRect ? menuRect.bottom - 54 : vh * 0.8);
			maxHeight = Math.max(160, top - 16);
		} else {
			const top = anchor?.bottom ?? menuRect?.top ?? 0;
			maxHeight = Math.max(160, vh - top - 12);
		}
		// Available horizontal space from the menu's left edge to the
		// viewport's right edge. Prefer the live menu position once mounted,
		// fall back to the anchor (the menu opens at its left edge).
		const menuLeft = menuRect?.left ?? anchor?.left ?? 0;
		const available = vw - menuLeft - marginRight;
		// Never wider than the screen; never wider than 800. Deliberately
		// no minimum — on tiny viewports the menu goes narrow and the
		// horizontal scrollbar keeps every column reachable.
		maxWidth = Math.max(0, Math.min(800, available));
		// Keep the current column fitting inside the new budget (menu
		// padding is 12px per side + 2px border) so a resize while open
		// can't strand a single column under the horizontal scrollbar.
		if (menuEl) {
			columnWidth = Math.min(columnWidth, Math.max(120, maxWidth - 26));
			// The height budget changed too, so the column count (and with
			// it the fitted width) may be stale — re-fit after layout.
			requestAnimationFrame(() => fitWidthToColumns());
		}
	}

	/** Measure the natural width of the widest header / item in the menu by
	 * cloning each off-screen at auto width, and size the columns so they
	 * fit that widest element plus a small right-edge breathing space.
	 * Avoids both oversized columns (everything looks tiny) and undersized
	 * columns (the label gets clipped before wrapping). */
	function measureColumnWidth() {
		if (typeof window === 'undefined') return;
		const menu = menuEl;
		if (!menu) return;
		const nodes = menu.querySelectorAll<HTMLElement>('.fx-add-head, .fx-add-item');
		if (!nodes.length) return;
		let max = 0;
		for (const node of nodes) {
			const clone = node.cloneNode(true) as HTMLElement;
			clone.style.position = 'absolute';
			clone.style.left = '-9999px';
			clone.style.top = '-9999px';
			clone.style.visibility = 'hidden';
			clone.style.width = 'auto';
			clone.style.minWidth = '0';
			document.body.appendChild(clone);
			const w = clone.scrollWidth;
			clone.remove();
			if (w > max) max = w;
		}
		if (max <= 0) return;
		const rightPadding = 24;
		const minCol = 140;
		const target = Math.max(minCol, max + rightPadding);
		// The column lives inside the menu's padding + border (12px per
		// side + 2px border), so cap it to the inner width — otherwise a
		// single column alone would trip the horizontal scrollbar.
		columnWidth = Math.min(target, Math.max(120, maxWidth - 26));
	}

	/** Size the menu to fit ALL its columns (not just one), capped by the
	 * viewport budget. Estimates the column count from the single-column
	 * content height, then grows a column at a time while content still
	 * overflows horizontally — `break-after: avoid` on headers can waste
	 * space the estimate doesn't see. Anything beyond the viewport stays
	 * reachable through the horizontal scrollbar. */
	function fitWidthToColumns() {
		const menu = menuEl;
		if (!menu) {
			ready = true;
			return;
		}
		const nodes = menu.querySelectorAll<HTMLElement>('.fx-add-head, .fx-add-item');
		if (!nodes.length) {
			ready = true;
			return;
		}
		let total = 0;
		for (const node of nodes) {
			const cs = getComputedStyle(node);
			total +=
				node.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
		}
		if (total <= 0) {
			ready = true;
			return;
		}
		const verticalChrome = 26; // 12px padding top/bottom + 2px border
		const availH = Math.max(60, maxHeight - verticalChrome);
		const cols = Math.max(1, Math.ceil(total / availH));
		const gap = 16;
		const horizChrome = 26;
		const needed = Math.ceil(horizChrome + cols * columnWidth + (cols - 1) * gap) + 2;
		fittedWidth = Math.min(needed, maxWidth);
		// Corrective pass: grow while columns still overflow (header
		// break-avoid waste, sub-pixel rounding), never past the viewport.
		// Only then reveal the menu — it is already correctly sized.
		requestAnimationFrame(() => {
			if (!menuEl?.isConnected || fittedWidth === null) {
				ready = true;
				return;
			}
			let guard = 0;
			while (
				guard++ < 6 &&
				menuEl.scrollWidth > menuEl.clientWidth + 2 &&
				fittedWidth < maxWidth
			) {
				fittedWidth = Math.min(fittedWidth + columnWidth + gap, maxWidth);
			}
			ready = true;
		});
	}

	onMount(() => {
		// First-paint bounds from the anchor (if given), then measure the
		// real content once mounted. Two RAFs: first waits for layout of the
		// mounted menu, second for the items we clone-measure.
		recomputeBounds();
		window.addEventListener('resize', recomputeBounds);
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				measureColumnWidth();
				fitWidthToColumns();
			})
		);
		// Safety net: never leave the menu invisible if measuring bailed out
		// early for any reason (e.g. closed before the RAFs ran).
		const fallback = setTimeout(() => {
			ready = true;
		}, 350);
		return () => {
			clearTimeout(fallback);
			window.removeEventListener('resize', recomputeBounds);
		};
	});
</script>

<div
	bind:this={menuEl}
	class="fx-add-menu"
	class:down={placement === 'down'}
	role="dialog"
	aria-label={ariaLabel}
	style="max-width:{maxWidth}px;max-height:{maxHeight}px;column-width:{columnWidth}px;{fittedWidth !==
	null
		? `width:${fittedWidth}px;`
		: ''}{ready ? '' : 'visibility:hidden;'}"
>
	{#if repeatLabel}
		<button class="fx-add-item" onclick={() => onRepeat?.()}>
			<span class="fx-add-ic">🔄</span>
			<span class="fx-add-item-label">{repeatLabel}</span>
		</button>
		<div class="fx-add-sep"></div>
	{/if}
	{#each effectMenusWithEntries as group (group.label)}
		<div class="fx-add-head">
			{#if iconForMenu(group.label)}
				<img
					class="fx-add-head-ic"
					src={iconForMenu(group.label)}
					alt=""
					draggable="false"
				/>
			{:else}
				<span class="fx-add-head-folder" aria-hidden="true">📁</span>
			{/if}
			<span class="fx-add-head-label">{group.label}</span>
		</div>
		{#each group.effects as eff (eff.id)}
			{@const label = getLabel?.(eff.id, eff.label) ?? eff.label}
			{@const enabled = isEnabled?.(eff.id) ?? true}
			{@const shortcut = getShortcut?.(eff.id)}
			<button class="fx-add-item" disabled={!enabled} onclick={() => onPick(eff.id)}>
				<span class="fx-add-ic">{eff.icon ?? ''}</span>
				<span class="fx-add-item-label">{label}</span>
				{#if shortcut}<span class="fx-add-shortcut">{shortcut}</span>{/if}
			</button>
		{/each}
	{/each}
</div>
