import { ColorMatrixFilter } from 'pixi.js';
import type { EffectDefinition } from '../types';

// Paint.NET's Black and White: a one-shot conversion to Rec. 601 luminance.
// Pixi's ColorMatrixFilter works on straight (un-premultiplied) colour and
// re-premultiplies on output, so the alpha row stays identity.
const definition: EffectDefinition = {
	label: 'Black and White',
	icon: '🌑',
	params: [],
	filter: () => {
		const cm = new ColorMatrixFilter();
		cm.matrix = [
			0.299, 0.587, 0.114, 0, 0,
			0.299, 0.587, 0.114, 0, 0,
			0.299, 0.587, 0.114, 0, 0,
			0, 0, 0, 1, 0
		];
		return cm;
	},
	isNoop: () => false
};

export default definition;
