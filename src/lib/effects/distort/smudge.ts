import type { EffectDefinition, EffectSettings } from '../types';
import { documentAspect, makeGlFilter } from '../shaders';

const STRENGTH = 40;

// Radial smudge centred on a focal point: pixels are pushed away from
// (or pulled toward, with negative strength) the chosen spot.
const SMUDGE_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uStrength;
	uniform float uAspect;

	void main()
	{
		vec2 p = (vTextureCoord - uCenter) * vec2(uAspect, 1.0);
		float r = length(p);
		float f = 1.0 + uStrength * exp(-r * 2.0);
		vec2 s = uCenter + f * p / vec2(uAspect, 1.0);
		finalColor = texture(uTexture, s);
	}
`;

const definition: EffectDefinition = {
	label: 'Smudge',
	icon: '🖱',
	params: [
		{
			key: 'strength',
			label: 'Strength',
			min: -100,
			max: 100,
			step: 1,
			default: STRENGTH
		},
		{ key: 'centerX', label: 'Center X', min: 0, max: 100, step: 1, default: 50 },
		{ key: 'centerY', label: 'Center Y', min: 0, max: 100, step: 1, default: 50 }
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			SMUDGE_FRAGMENT,
			{
				uCenter: { value: [settings.centerX / 100, settings.centerY / 100], type: 'vec2<f32>' },
				uStrength: { value: settings.strength * 0.02, type: 'f32' },
				uAspect: { value: documentAspect(), type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.strength === 0
};

export default definition;