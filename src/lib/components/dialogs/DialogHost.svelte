<script lang="ts">
	// Layer: components. Mounts the currently-open dialog from the dialog store.
	import { dialog } from '../../services/dialogService';
	import type { EffectDialogPayload, LayerEffectDialogPayload } from '../../services/dialogService';
	import NewImageDialog from './NewImageDialog.svelte';
	import EffectDialog from './EffectDialog.svelte';
	import LayerEffectDialog from './LayerEffectDialog.svelte';
	import RasterizeConfirmDialog from './RasterizeConfirmDialog.svelte';
	import ImageSizeDialog from './ImageSizeDialog.svelte';
	import CurvesDialog from './CurvesDialog.svelte';
</script>

{#if $dialog.kind === 'newImage'}
	<NewImageDialog />
{:else if $dialog.kind === 'effect'}
	<EffectDialog payload={$dialog.payload as EffectDialogPayload} />
{:else if $dialog.kind === 'layerEffect'}
	<LayerEffectDialog payload={$dialog.payload as LayerEffectDialogPayload} />
{:else if $dialog.kind === 'rasterizeConfirm'}
	<RasterizeConfirmDialog />
{:else if $dialog.kind === 'imageSize'}
	<ImageSizeDialog />
{:else if $dialog.kind === 'curves'}
	<CurvesDialog />
{/if}
