import type { EffectDefinition, EffectSettings } from '../types';
import { documentAspect, makeGlFilter } from '../shaders';

const AMOUNT = 30;

// Lens bulge: magnifies the region around the focal point, held fixed at the
// frame edge (f = 1 − k·(1 − r²) → compress sampling near the centre).
const BULGE_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uAmount;
	uniform float uAspect;

	void main()
	{
		vec2 d = (vTextureCoord - uCenter) * vec2(uAspect, 1.0);
		float r2 = dot(d, d);
		float f = 1.0 - uAmount * (1.0 - r2);
		vec2 s = uCenter + d * f / vec2(uAspect, 1.0);
		finalColor = texture(uTexture, s);
	}
`;

const definition: EffectDefinition = {
	label: 'Bulge',
	icon: '🔍',
	params: [
		{
			key: 'amount',
			label: 'Bulge',
			min: 0,
			max: 100,
			step: 1,
			default: AMOUNT
		},
		{ key: 'centerX', label: 'Center X', min: 0, max: 100, step: 1, default: 50 },
		{ key: 'centerY', label: 'Center Y', min: 0, max: 100, step: 1, default: 50 }
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			BULGE_FRAGMENT,
			{
				uCenter: { value: [settings.centerX / 100, settings.centerY / 100], type: 'vec2<f32>' },
				uAmount: { value: settings.amount * 0.002, type: 'f32' },
				uAspect: { value: documentAspect(), type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.amount <= 0
};

export default definition;