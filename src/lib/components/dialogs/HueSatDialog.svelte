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
	const prefs = $state<HslPrefs>(getSettings<HslPrefs>('filters.hueSat', { hue: 0, sat: 100, light: 100 }));

	let previewOn = $state(true);
	const renderer = () => getEditorRenderer();

	/** Hue track: light-blue on the left, then the full hue spectrum. */
	const hueGradient =
		'linear-gradient(90deg, hsl(200,80%,70%) 0%, hsl(0,100%,50%) 8.33%, hsl(60,100%,50%) 25%, hsl(120,100%,50%) 41.67%, hsl(180,100%,50%) 58.33%, hsl(240,100%,50%) 75%, hsl(300,100%,50%) 91.67%, hsl(360,100%,50%) 100%)';

	/** Saturation track: desaturated on the left (same hue & lightness, zero
	 *  saturation) → fully saturated on the right. The base hue is taken from
	 *  the current hue shift so the bar reflects the adjusted colour. */
	const satGradient = $derived(() => {
		const baseHue = 200 + prefs.hue; // approximate starting hue (200 ≈ light blue)
		const lightPct = Math.round(prefs.light * 50 / 100); // 100 → 50%
		return `linear-gradient(90deg, hsl(${baseHue},0%,${lightPct}%) 0%, hsl(${baseHue},100%,${lightPct}%) 100%)`;
	});

	/** Lightness track: black → white. */
	const lightGradient = 'linear-gradient(90deg, #000 0%, #fff 100%)';

	function makeFilter() {
		const cm = new ColorMatrixFilter();
		cm.saturate(Math.max(0, prefs.sat) / 100, true);
		cm.hue(prefs.hue, true);
		cm.brightness(Math.max(0, prefs.light) / 100, true);
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
	<FilterSlider label="Saturation" min={0} max={200} step={1} default={100} bind:value={prefs.sat} oninput={preview} gradient={satGradient()} />
	<FilterSlider label="Lightness" min={0} max={200} step={1} default={100} bind:value={prefs.light} oninput={preview} gradient={lightGradient} />
	<label class="radio">
		<input type="checkbox" bind:checked={previewOn} onchange={togglePreview} />
		Preview
	</label>

	{#snippet actions()}
		<button class="btn-secondary" onclick={cancel}>Cancel</button>
		<button class="btn-primary" onclick={apply}>Apply</button>
	{/snippet}
</MovableDialog>
