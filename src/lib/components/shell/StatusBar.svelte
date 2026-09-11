<script lang="ts">
	// Layer: components. Bottom status bar: notice, document size, zoom, cursor.
	//
	// The numeric read-outs used to be three bare, indistinguishable pairs
	// (`800 × 600` / `142 × 99` / `(377, 337)`). Each now leads with a Material
	// Symbols glyph — image, marquee, mouse — so it is obvious at a glance which
	// is the document, which is the rectangle being drawn and which is the
	// pointer. The classes on the glyph spans name the read-out they belong to.
	//
	// Imported `?raw` and inlined with {@html} so the shipped black SVGs can be
	// re-coloured at all (they carry no `fill`); see `.sb-ic` in layout.css for
	// why they are all one muted grey. Same convention as MenuBar's .menu-svg.
	import { statusBar, notice } from '../../state/ui';
	import { selectionSize } from '../../state/documents';
	import { openDialog } from '../../services/dialogService';
	import ImageSizeIcon from '@material-symbols/svg-400/rounded/photo_size_select_large.svg?raw';
	import MarqueeIcon from '@material-symbols/svg-400/rounded/crop_free.svg?raw';
	import MouseIcon from '@material-symbols/svg-400/rounded/mouse.svg?raw';
</script>

	<div class="flex h-full w-full items-center gap-4 overflow-hidden px-3 text-xs select-none" style="color:#bdbdbd;">
	{#if $notice}
		<span class="notice" class:error={$notice.kind === 'error'}>{$notice.text}</span>
	{/if}
	{#if $statusBar.imageW !== null}
		<button
			type="button"
			class="status-dim"
			title="Image size: {$statusBar.imageW} × {$statusBar.imageH} px — click to change the image or canvas size"
			onclick={() => openDialog('imageSize')}
		>
			<span class="sb-ic sb-image" aria-hidden="true">{@html ImageSizeIcon}</span>
			{$statusBar.imageW} × {$statusBar.imageH}
		</button>
	{/if}
	{#if $statusBar.selW !== null}
		<button
			type="button"
			class="status-dim"
			title="Selection size: {$statusBar.selW} × {$statusBar.selH} px — click to type an exact size"
			onclick={() => openDialog('selectionSize')}
		>
			<span class="sb-ic sb-marquee" aria-hidden="true">{@html MarqueeIcon}</span>
			{$statusBar.selW} × {$statusBar.selH}
		</button>
	{:else if $selectionSize}
		<button
			type="button"
			class="status-dim"
			title="Selection size: {$selectionSize.w} × {$selectionSize.h} px — click to type an exact size"
			onclick={() => openDialog('selectionSize')}
		>
			<span class="sb-ic sb-marquee" aria-hidden="true">{@html MarqueeIcon}</span>
			{$selectionSize.w} × {$selectionSize.h}
		</button>
	{/if}
	{#if $statusBar.cursorX !== null && $statusBar.cursorY !== null}
		<span class="sb-read" title="Pointer position: {$statusBar.cursorX}, {$statusBar.cursorY} px">
			<span class="sb-ic sb-mouse" aria-hidden="true">{@html MouseIcon}</span>
			{$statusBar.cursorX}, {$statusBar.cursorY}
		</span>
	{/if}
</div>
