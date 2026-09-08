<script lang="ts">
	// Layer: components. Asks before rasterising a text layer so paint tools
	// can edit its pixels (the text becomes non-editable afterwards). Shown
	// only when the user actually clicks the canvas with a paint tool active.
	import MovableDialog from '../common/MovableDialog.svelte';
	import { dialog, closeDialog, type RasterizeConfirmPayload } from '../../services/dialogService';

	const payload = $dialog.payload as RasterizeConfirmPayload | undefined;

	function confirm(): void {
		try {
			payload?.onConfirm?.();
		} finally {
			closeDialog();
		}
	}
	function cancel(): void {
		closeDialog();
	}
</script>

<MovableDialog title="Text Layer" onClose={cancel} width={380}>
	<p class="rd-body">Do you want to rasterize the layer first?</p>
	<p class="rd-hint">Paint tools can only be used on a raster layer. The text will no longer be editable.</p>

	{#snippet actions()}
		<button class="btn-secondary" onclick={cancel}>Cancel</button>
		<button class="btn-primary" onclick={confirm}>Yes, Rasterize</button>
	{/snippet}
</MovableDialog>

<style>
	.rd-body {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: #e8e8e8;
	}
	.rd-hint {
		margin: 8px 0 0;
		font-size: 12px;
		color: #9a9a9a;
		line-height: 1.4;
	}
</style>