import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const AMOUNT = 25;

const RADIAL_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uAmount;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec2 dir = normalize(vTextureCoord - uCenter + 1e-5);
		float extent = uAmount * texel.x;

		vec4 acc = vec4(0.0);
		for (int i = 0; i < 24; i++)
		{
			float t = float(i) / 23.0;
			acc += texture(uTexture, vTextureCoord - dir * extent * t);
		}
		finalColor = acc / 24.0;
	}
`;

const definition: EffectDefinition = {
	label: 'Radial Blur',
	icon: '💫',
	params: [
		{
			key: 'amount',
			label: 'Blur amount',
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
			RADIAL_FRAGMENT,
			{
				uCenter: { value: [settings.centerX / 100, settings.centerY / 100], type: 'vec2<f32>' },
				uAmount: { value: settings.amount, type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.amount <= 0
};

export default definition;