<script lang="ts">
	// Layer: components. Bottom status bar: notice, document size, zoom, cursor.
	import { statusBar, notice } from '../../state/ui';
</script>

<div class="flex h-full w-full items-center gap-4 overflow-hidden px-3 text-xs" style="color:#bdbdbd;">
	{#if $notice}
		<span class="notice" class:error={$notice.kind === 'error'}>{$notice.text}</span>
	{/if}
	{#if $statusBar.imageW !== null}
		<span>{$statusBar.imageW} × {$statusBar.imageH}</span>
	{/if}
	{#if $statusBar.zoomPct !== null}
		<span class="ml-auto font-semibold" style="color:#eee;">{$statusBar.zoomPct}%</span>
	{/if}
	{#if $statusBar.cursorX !== null && $statusBar.cursorY !== null}
		<span>({$statusBar.cursorX}, {$statusBar.cursorY})</span>
	{/if}
</div>
