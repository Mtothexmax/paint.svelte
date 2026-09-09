<script lang="ts">
	import XYPicker from './XYPicker.svelte';
	import type { EffectParam } from '../../effects/types';

	// Layer: components. Bridges an `xy` effect param (two numeric settings keys
	// `${key}X` / `${key}Y`) to the reusable XYPicker. Owns the per-instance
	// `{x, y}` state so the dialogs themselves stay stateless.
	interface Props {
		param: EffectParam;
		settings: Record<string, number>;
		onChange?: () => void;
	}
	let { param, settings, onChange }: Props = $props();

	const kx = `${param.key}X`;
	const ky = `${param.key}Y`;
	let xy = $state({
		x: settings[kx] ?? param.default,
		y: settings[ky] ?? (param.defaultY ?? param.default)
	});

	function sync(): void {
		settings[kx] = xy.x;
		settings[ky] = xy.y;
		onChange?.();
	}
</script>

<XYPicker
	bind:value={xy}
	minX={param.minX ?? -100}
	maxX={param.maxX ?? 100}
	minY={param.minY ?? -100}
	maxY={param.maxY ?? 100}
	step={param.step ?? 1}
	default={{ x: param.default, y: param.defaultY ?? param.default }}
	label={param.label}
	oninput={sync}
	onCommit={sync}
/>
