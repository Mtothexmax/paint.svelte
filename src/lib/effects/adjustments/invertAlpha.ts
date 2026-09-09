import { ColorMatrixFilter } from 'pixi.js';
import type { EffectDefinition } from '../types';

// Paint.NET's "Invert Alpha": A' = 1 - A, RGB untouched.
//
// The filter shader runs on straight colour, so leaving the RGB rows at
// identity and flipping only the alpha row produces exactly the right result:
// the un-associated colour is preserved and re-premultiplied with the new
// alpha. (Fully transparent pixels become fully opaque *with the same colour*,
// which is the expected Paint.NET behaviour.)
const definition: EffectDefinition = {
	label: 'Invert Alpha',
	icon: '🫧',
	params: [],
	filter: () => {
		const cm = new ColorMatrixFilter();
		cm.matrix = [
			1, 0, 0, 0, 0,
			0, 1, 0, 0, 0,
			0, 0, 1, 0, 0,
			0, 0, 0, -1, 1
		];
		return cm;
	},
	isNoop: () => false
};

export default definition;
