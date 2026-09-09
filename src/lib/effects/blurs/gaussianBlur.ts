import { BlurFilter } from 'pixi.js';
import type { EffectDefinition, EffectSettings } from '../types';

const STRENGTH = 8;

const blurGradient =
	'linear-gradient(90deg, #2A7B9B 0%, #2A7B9B 3%, #57C785 3%, #57C785 6%, #2A7B9B 6%, #2A7B9B 10%, #57C785 10%, #57C785 15%, #2A7B9B 18%, #57C785 28%, #2A7B9B 45%, #57C785 70%, #2A7B9B 100%)';

const definition: EffectDefinition = {
	label: 'Gaussian Blur',
	icon: '💧',
	params: [
		{
			key: 'strength',
			label: 'Blur strength',
			min: 0,
			max: 50,
			step: 1,
			default: STRENGTH,
			gradient: blurGradient
		}
	],
	filter: (settings: EffectSettings) =>
		new BlurFilter({ strength: settings.strength, resolution: 1 }),
	isNoop: (settings: EffectSettings) => settings.strength <= 0
};

export default definition;