<script lang="ts">
	// Layer: components. Right sidebar: chrome panel-card stack (History at
	// the top, Layers below). The sidebar itself wears the chrome-hi/lo
	// gradient (see `.sidebar-col` in layout.css); each child panel sits in
	// its own darker chrome card on top of it.
	import HistoryPanel from '../panels/HistoryPanel.svelte';
	import LayersPanel from '../panels/LayersPanel.svelte';
</script>

<div class="sidebar-stack">
	<div class="shrink-0"><HistoryPanel /></div>
	<div class="min-h-0 flex-1"><LayersPanel /></div>
</div>

<style>
	/* Vertical stack of chrome panel cards. */
	.sidebar-stack {
		display: flex;
		flex-direction: column;
		gap: 6px;
		height: 100%;
		width: 100%;
		min-height: 0;
		overflow: hidden;
	}
</style>
