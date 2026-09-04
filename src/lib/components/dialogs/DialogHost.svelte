<script lang="ts">
	// Layer: components. Mounts the currently-open dialog from the dialog store.
	import { dialog } from '../../services/dialogService';
	import NewImageDialog from './NewImageDialog.svelte';
	import BlurDialog from './BlurDialog.svelte';
	import HueSatDialog from './HueSatDialog.svelte';
	import BrightContDialog from './BrightContDialog.svelte';
</script>

{#if $dialog.kind === 'newImage'}
	<NewImageDialog />
{:else if $dialog.kind === 'blur'}
	<BlurDialog />
{:else if $dialog.kind === 'hueSat'}
	<HueSatDialog />
{:else if $dialog.kind === 'brightCont'}
	<BrightContDialog />
{/if}
