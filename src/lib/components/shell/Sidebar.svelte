<script lang="ts">
	// Layer: components. Right sidebar: History (top) and Layers panels.
	import HistoryPanel from '../panels/HistoryPanel.svelte';
	import LayersPanel from '../panels/LayersPanel.svelte';
</script>

<div class="flex h-full w-full flex-col gap-2 overflow-hidden p-2" style="background:#262626;">
	<div class="shrink-0"><HistoryPanel /></div>
	<div class="min-h-0 flex-1"><LayersPanel /></div>
</div>
