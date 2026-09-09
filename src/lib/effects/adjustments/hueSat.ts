import { ColorMatrixFilter } from 'pixi.js';
import type { EffectDefinition, EffectSettings } from '../types';

const HUE = 0;
const SAT = 100;
const LIGHT = 100;

/** Slider tracks matching the three controls (kept from the old dialog). */
const HUE_GRADIENT =
	'linear-gradient(90deg, hsl(0,100%,50%) 0%, hsl(60,100%,50%) 16.6%, hsl(120,100%,50%) 33.3%, hsl(180,100%,50%) 50%, hsl(240,100%,50%) 66.6%, hsl(300,100%,50%) 83.3%, hsl(360,100%,50%) 100%)';
const SAT_GRADIENT =
	'linear-gradient(90deg, hsl(0,0%,50%) 0%, hsl(60,17%,50%) 16.6%, hsl(120,33%,50%) 33.3%, hsl(180,50%,50%) 50%, hsl(240,67%,50%) 66.6%, hsl(300,83%,50%) 83.3%, hsl(360,100%,50%) 100%)';
const LIGHT_GRADIENT = 'linear-gradient(90deg, #000 0%, #fff 100%)';

// Paint.NET ranges: Hue -180..180°, Saturation/Lightness 0..200 with 100 =
// unchanged. Composed into a single ColorMatrixFilter (Pixi handles the
// premultiply round-trip).
const definition: EffectDefinition = {
	label: 'Hue / Saturation',
	icon: '🎨',
	params: [
		{
			key: 'hue',
			label: 'Hue',
			min: -180,
			max: 180,
			step: 1,
			default: HUE,
			gradient: HUE_GRADIENT
		},
		{
			key: 'sat',
			label: 'Saturation',
			min: 0,
			max: 200,
			step: 1,
			default: SAT,
			gradient: SAT_GRADIENT
		},
		{
			key: 'light',
			label: 'Lightness',
			min: 0,
			max: 200,
			step: 1,
			default: LIGHT,
			gradient: LIGHT_GRADIENT
		}
	],
	filter: (settings: EffectSettings) => {
		const cm = new ColorMatrixFilter();
		cm.saturate(Math.max(0, settings.sat / 100), true);
		cm.hue(settings.hue, true);
		cm.brightness(Math.max(0, settings.light / 100), true);
		return cm;
	},
	isNoop: (settings: EffectSettings) =>
		settings.hue === 0 && settings.sat === 100 && settings.light === 100
};

export default definition;
