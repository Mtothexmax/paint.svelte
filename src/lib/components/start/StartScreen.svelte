<script lang="ts">
	import { openFromPicker, openFiles, openFromClipboard } from '../../services/fileService';
	import { openDialog } from '../../services/dialogService';

	let dragging = $state(false);

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		dragging = true;
	}
	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		dragging = false;
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		if (e.dataTransfer?.files?.length) void openFiles(e.dataTransfer.files);
	}
	function onZoneKey(e: KeyboardEvent) {
		if (e.key === 'Enter') openFromPicker();
	}
</script>

<div class="flex h-full w-full flex-col items-center justify-center gap-6 p-8" style="background:#1f1f1f;">
	<div class="flex flex-col items-center gap-2">
		<span class="text-4xl">🎨</span>
		<h1 class="text-xl font-semibold" style="color:#e0e0e0;">Paint</h1>
		<p class="text-sm" style="color:#9a9a9a;">Drop images here, open a file, or create a new canvas.</p>
	</div>

	<div
		class="flex w-full max-w-xl cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors"
		style="border-color:{dragging ? '#3b82f6' : '#4a4a4a'}; background:{dragging ? 'rgba(59,130,246,0.08)' : 'transparent'};"
		role="button"
		tabindex="0"
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		ondrop={onDrop}
		onclick={() => openFromPicker()}
		onkeydown={onZoneKey}
	>
		<span class="text-3xl">🖼️</span>
		<span class="text-sm font-medium" style="color:#c8c8c8;">Click to open, or drop image files here</span>
		<span class="text-xs" style="color:#7a7a7a;">PNG · JPEG · WebP — multiple files open multiple tabs</span>
	</div>

	<div class="flex gap-3">
		<button class="btn-primary" onclick={() => openDialog('newImage')}>New…</button>
		<button class="btn-secondary" onclick={() => void openFromClipboard()}>From Clipboard…</button>
		<button class="btn-secondary" onclick={() => openFromPicker()}>Open…</button>
	</div>
</div>
