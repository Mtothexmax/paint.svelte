<script lang="ts">
	// Layer: components. Bottom status bar: notice, document size, zoom, cursor.
	import { statusBar, notice } from '../../state/ui';
	import { selectionSize } from '../../state/documents';
</script>

	<div class="flex h-full w-full items-center gap-4 overflow-hidden px-3 text-xs select-none" style="color:#bdbdbd;">
	{#if $notice}
		<span class="notice" class:error={$notice.kind === 'error'}>{$notice.text}</span>
	{/if}
	{#if $statusBar.imageW !== null}
		<span>{$statusBar.imageW} × {$statusBar.imageH}</span>
	{/if}
	{#if $statusBar.selW !== null}
		<span>{$statusBar.selW} × {$statusBar.selH}</span>
	{:else if $selectionSize}
		<span>{$selectionSize.w} × {$selectionSize.h}</span>
	{/if}
	{#if $statusBar.cursorX !== null && $statusBar.cursorY !== null}
		<span>({$statusBar.cursorX}, {$statusBar.cursorY})</span>
	{/if}
</div>
