import { ColorMatrixFilter } from 'pixi.js';
import type { EffectDefinition } from '../types';

// Classic sepia toning (Paint.NET's Sepia is a fixed, one-shot matrix).
const definition: EffectDefinition = {
	label: 'Sepia',
	icon: '📜',
	params: [],
	filter: () => {
		const cm = new ColorMatrixFilter();
		cm.matrix = [
			0.393, 0.769, 0.189, 0, 0,
			0.349, 0.686, 0.168, 0, 0,
			0.272, 0.534, 0.131, 0, 0,
			0, 0, 0, 1, 0
		];
		return cm;
	},
	isNoop: () => false
};

export default definition;
