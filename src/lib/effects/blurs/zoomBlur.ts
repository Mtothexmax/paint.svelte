import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const AMOUNT = 30;

// Focus-burst: samples progressively magnified positions along the ray from
// the focal point, so content appears to "zoom" toward the centre — this is
// what Paint.NET's Zoom Blur (a.k.a. radial zoom) looks like.
const ZOOM_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uAmount;

	void main()
	{
		vec2 dir = vTextureCoord - uCenter;
		float r = length(dir);
		vec2 unit = r > 1e-6 ? dir / r : vec2(0.0);

		vec4 acc = vec4(0.0);
		for (int i = 0; i < 24; i++)
		{
			float t = float(i) / 24.0;
			float scale = 1.0 + t * t * uAmount * 0.02;
			acc += texture(uTexture, uCenter + unit * r * scale);
		}
		finalColor = acc / 24.0;
	}
`;

const definition: EffectDefinition = {
	label: 'Zoom Blur',
	icon: '🎯',
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
			ZOOM_FRAGMENT,
			{
				uCenter: { value: [settings.centerX / 100, settings.centerY / 100], type: 'vec2<f32>' },
				uAmount: { value: settings.amount, type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.amount <= 0
};

export default definition;