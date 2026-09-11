<script lang="ts">
	// Layer: components. Mounts the currently-open dialog from the dialog store.
	import { dialog } from '../../services/dialogService';
	import type { EffectDialogPayload, LayerEffectDialogPayload } from '../../services/dialogService';
	import NewImageDialog from './NewImageDialog.svelte';
	import EffectDialog from './EffectDialog.svelte';
	import LayerEffectDialog from './LayerEffectDialog.svelte';
	import RasterizeConfirmDialog from './RasterizeConfirmDialog.svelte';
	import ImageSizeDialog from './ImageSizeDialog.svelte';
	import SelectionSizeDialog from './SelectionSizeDialog.svelte';
	import CurvesDialog from './CurvesDialog.svelte';
	import LevelsDialog from './LevelsDialog.svelte';
	import PasteDialog from './PasteDialog.svelte';
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
{:else if $dialog.kind === 'selectionSize'}
	<SelectionSizeDialog />
{:else if $dialog.kind === 'curves'}
	<CurvesDialog />
{:else if $dialog.kind === 'levels'}
	<LevelsDialog />
{:else if $dialog.kind === 'paste'}
	<PasteDialog />
{/if}
