<script lang="ts">
	// Layer: components. Mounts the currently-open dialog from the dialog store.
	import { dialog } from '../../services/dialogService';
	import NewImageDialog from './NewImageDialog.svelte';
</script>

{#if $dialog.kind === 'newImage'}
	<NewImageDialog />
{/if}
