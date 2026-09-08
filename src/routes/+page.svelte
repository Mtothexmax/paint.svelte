<script lang="ts">
	// Entry: renders the editor shell. Client-only (needs WebGL/DOM); see +page.ts.
	import App from '$lib/components/App.svelte';
	import { documentRegistry } from '$lib/core/document/registry';
	if (import.meta.env.DEV) {
		// Dev-only hook for headless probes.
		(window as unknown as { __REGISTRY__: typeof documentRegistry }).__REGISTRY__ = documentRegistry;
	}
</script>

<svelte:head>
	<title>Paint — Image Editor</title>
</svelte:head>

<App />
