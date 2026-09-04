<script lang="ts">
	// Layer: components. Hue / Saturation / Lightness — movable popup with live
	// preview and persisted last-used configuration.
	import { onMount } from 'svelte';
	import { ColorMatrixFilter } from 'pixi.js';
	import MovableDialog from '../common/MovableDialog.svelte';
	import FilterSlider from '../common/FilterSlider.svelte';
	import { getEditorRenderer } from '../../render/EditorRenderer';
	import { hueSaturationActiveLayer } from '../../render/effects';
	import { closeDialog } from '../../services/dialogService';
	import { getSettings, saveSettings } from '../../services/settingsService';
	import { rememberLastApplied } from '../../state/repeat';

	interface HslPrefs {
		hue: number;
		sat: number;
		light: number;
	}
	const prefs = $state<HslPrefs>(getSettings<HslPrefs>('filters.hueSat', { hue: 0, sat: 0, light: 0 }));

	let previewOn = $state(true);
	const renderer = () => getEditorRenderer();

	/** Hue track: fully saturated rainbow (100% saturation throughout). */
	const hueGradient =
		'linear-gradient(90deg, hsl(0,100%,50%) 0%, hsl(60,100%,50%) 16.6%, hsl(120,100%,50%) 33.3%, hsl(180,100%,50%) 50%, hsl(240,100%,50%) 66.6%, hsl(300,100%,50%) 83.3%, hsl(360,100%,50%) 100%)';

	/** Saturation track: grey on the left (0% sat) → vivid on the right,
	 *  with saturation increasing linearly across the hue spectrum. */
	const satGradient =
		'linear-gradient(90deg, hsl(0,0%,50%) 0%, hsl(60,17%,50%) 16.6%, hsl(120,33%,50%) 33.3%, hsl(180,50%,50%) 50%, hsl(240,67%,50%) 66.6%, hsl(300,83%,50%) 83.3%, hsl(360,100%,50%) 100%)';

	/** Lightness track: black → white. */
	const lightGradient = 'linear-gradient(90deg, #000 0%, #fff 100%)';

	function makeFilter() {
		const cm = new ColorMatrixFilter();
		cm.saturate((100 + prefs.sat) / 100, true);
		cm.hue(prefs.hue, true);
		cm.brightness((100 + prefs.light) / 100, true);
		return cm;
	}
	function preview() {
		if (previewOn) renderer().setActiveLayerFilterPreview(makeFilter());
		else renderer().setActiveLayerFilterPreview(null);
	}
	function togglePreview() {
		preview();
	}

	$effect(() =>
		saveSettings('filters.hueSat', { hue: prefs.hue, sat: prefs.sat, light: prefs.light })
	);

	function apply() {
		const r = renderer();
		r.setActiveLayerFilterPreview(null);
		const { hue, sat, light } = prefs;
		if (hueSaturationActiveLayer(r, { hue, sat, light })) {
			rememberLastApplied({
				menu: 'adjustments',
				name: 'Hue/Saturation',
				apply: () => hueSaturationActiveLayer(getEditorRenderer(), { hue, sat, light })
			});
			closeDialog();
		}
	}
	function cancel() {
		renderer().setActiveLayerFilterPreview(null);
		closeDialog();
	}

	onMount(() => {
		preview();
		return () => renderer().setActiveLayerFilterPreview(null);
	});
</script>

<MovableDialog title="Hue / Saturation" onClose={cancel} width={400}>
	<FilterSlider label="Hue" min={-180} max={180} step={1} default={0} bind:value={prefs.hue} oninput={preview} gradient={hueGradient} />
	<FilterSlider label="Saturation" min={0} max={200} step={1} default={0} bind:value={prefs.sat} oninput={preview} gradient={satGradient} />
	<FilterSlider label="Lightness" min={-100} max={100} step={1} default={0} bind:value={prefs.light} oninput={preview} gradient={lightGradient} />
	<label class="radio">
		<input type="checkbox" bind:checked={previewOn} onchange={togglePreview} />
		Preview
	</label>

	{#snippet actions()}
		<button class="btn-secondary" onclick={cancel}>Cancel</button>
		<button class="btn-primary" onclick={apply}>Apply</button>
	{/snippet}
</MovableDialog>
