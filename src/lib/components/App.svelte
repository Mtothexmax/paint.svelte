<script lang="ts">
	// Layer: components (top-level shell). Wires the whole editor together.
	import { onMount } from 'svelte';
	import { documents } from '../state/documents';
	import { registerBuiltinCommands } from '../services/commands';
	import { startShortcutService } from '../services/shortcutService';
	import { startThumbnails } from '../state/thumbnails';

	import MenuBar from './shell/MenuBar.svelte';
	import TabBar from './shell/TabBar.svelte';
	import ToolOptions from './shell/ToolOptions.svelte';
	import Toolbar from './shell/Toolbar.svelte';
	import Sidebar from './shell/Sidebar.svelte';
	import ColorBar from './shell/ColorBar.svelte';
	import StatusBar from './shell/StatusBar.svelte';
	import EditorCanvas from './canvas/EditorCanvas.svelte';
	import StartScreen from './start/StartScreen.svelte';
	import DialogHost from './dialogs/DialogHost.svelte';

	let hasDocs = $derived($documents.docs.length > 0);

	onMount(() => {
		registerBuiltinCommands();
		const stopShortcuts = startShortcutService();
		const stopThumbs = startThumbnails();
		return () => {
			stopShortcuts();
			stopThumbs();
		};
	});
</script>

<div
	class="relative flex h-screen w-screen flex-col overflow-hidden"
	oncontextmenu={(e) => e.preventDefault()}
>
	<div class="menubar-strip"><MenuBar /></div>
	<div class="options-strip"><ToolOptions /></div>

	{#if hasDocs}
		<div class="tab-tray-overlay"><TabBar /></div>
	{/if}

	<div class="flex min-h-0 flex-1">
		{#if hasDocs}
			<div class="toolbar-col"><Toolbar /></div>
		{/if}

		<div class="relative min-h-0 min-w-0 flex-1">
			<EditorCanvas />
			{#if !hasDocs}
				<div class="absolute inset-0 z-10"><StartScreen /></div>
			{/if}
		</div>

		{#if hasDocs}
			<div class="sidebar-col"><Sidebar /></div>
		{/if}
	</div>

	<div class="status-strip">
		<div class="flex h-full items-center"><ColorBar /></div>
		<div class="flex h-full flex-1 items-stretch border-l" style="border-color:#3a3a3a;">
			<StatusBar />
		</div>
	</div>

	<DialogHost />
</div>
