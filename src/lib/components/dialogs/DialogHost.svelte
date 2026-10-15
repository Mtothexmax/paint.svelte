<script lang="ts">
	// Layer: components. Mounts the currently-open dialog from the dialog store.
	import { dialog } from '../../services/dialogService';
	import type { EffectDialogPayload, LayerEffectDialogPayload } from '../../services/dialogService';
	import type { AiBackgroundRemovalPayload } from '../../services/dialogService';
	import NewImageDialog from './NewImageDialog.svelte';
	import FilterPopup from './FilterPopup.svelte';
	import LayerEffectDialog from './LayerEffectDialog.svelte';
	import RasterizeConfirmDialog from './RasterizeConfirmDialog.svelte';
	import ImageSizeDialog from './ImageSizeDialog.svelte';
	import LayerOpacityDialog from './LayerOpacityDialog.svelte';
	import SelectionSizeDialog from './SelectionSizeDialog.svelte';
	import PasteDialog from './PasteDialog.svelte';

	// Lazy-loaded heavy dialogs (loaded only when opened)
	const CurvesDialog = () => import('./CurvesDialog.svelte');
	const LevelsDialog = () => import('./LevelsDialog.svelte');
	const AiBackgroundRemovalDialog = () => import('./AiBackgroundRemovalDialog.svelte');
</script>

{#if $dialog.kind === 'newImage'}
	<NewImageDialog />
{:else if $dialog.kind === 'effect'}
	{#key ($dialog.payload as EffectDialogPayload).effectId}
		<FilterPopup effectId={($dialog.payload as EffectDialogPayload).effectId} />
	{/key}
{:else if $dialog.kind === 'layerEffect'}
	<LayerEffectDialog payload={$dialog.payload as LayerEffectDialogPayload} />
{:else if $dialog.kind === 'rasterizeConfirm'}
	<RasterizeConfirmDialog />
{:else if $dialog.kind === 'imageSize'}
	<ImageSizeDialog />
{:else if $dialog.kind === 'layerOpacity'}
	<LayerOpacityDialog />
{:else if $dialog.kind === 'selectionSize'}
	<SelectionSizeDialog />
{:else if $dialog.kind === 'curves'}
	{#await CurvesDialog() then m}
		<m.default />
	{/await}
{:else if $dialog.kind === 'levels'}
	{#await LevelsDialog() then m}
		<m.default />
	{/await}
{:else if $dialog.kind === 'paste'}
	<PasteDialog />
{:else if $dialog.kind === 'aiBackgroundRemoval'}
	{#await AiBackgroundRemovalDialog() then m}
		<m.default payload={$dialog.payload as AiBackgroundRemovalPayload} />
	{/await}
{/if}
