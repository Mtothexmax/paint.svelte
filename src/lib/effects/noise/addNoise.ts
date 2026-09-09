import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const AMOUNT = 25;

// Perceptual grain: a seeded hash adds uniformly-distributed noise to every
// pixel. At monochrome=0 the noise jitters individual RGB channels (film
// grain); at monochrome=1 it pushes the luminance instead (grey texture).
const ADD_NOISE_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAmount;
	uniform float uMonochrome;
	uniform float uSeed;
	uniform float uLinkAlpha;

	float hash(vec2 p)
	{
		return fract(sin(dot(p, vec2(127.1, 311.7) + uSeed)) * 43758.5453123);
	}

	void main()
	{
		vec2 px = vTextureCoord * uInputSize.xy;
		float n = hash(px) - 0.5;
		vec4 c = texture(uTexture, vTextureCoord);
		// When linked, the noise is bound to the layer's alpha mask instead
		// of being applied everywhere (strength follows opacity).
		float m = uLinkAlpha > 0.5 ? clamp(c.a, 0.0, 1.0) : 1.0;
		float gray = dot(c.rgb, vec3(0.299, 0.587, 0.114));
		vec3 noise = mix(
			vec3(n) * vec3(hash(px + 1.7), hash(px + 3.1), hash(px + 5.3)),
			vec3(n) * 0.4,
			uMonochrome
		);
		vec3 outColor = c.rgb + noise * uAmount * (1.0 + 0.5 * (1.0 - uMonochrome));
		outColor += (gray - c.rgb + noise * uAmount) * uMonochrome;
		finalColor = vec4(mix(c.rgb, max(outColor, 0.0), m), c.a);
	}
`;

const definition: EffectDefinition = {
	label: 'Add Noise',
	icon: '🌫',
	params: [
		{
			key: 'amount',
			label: 'Amount',
			min: 0,
			max: 100,
			step: 1,
			default: AMOUNT
		},
		{
			key: 'monochrome',
			label: 'Monochrome',
			min: 0,
			max: 100,
			step: 1,
			default: 0
		},
		{
			key: 'seed',
			label: 'Seed',
			min: 0,
			max: 1000,
			step: 1,
			default: 123
		},
		{
			key: 'linkAlpha',
			label: 'Link to alpha',
			min: 0,
			max: 1,
			step: 1,
			default: 1,
			kind: 'checkbox'
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			ADD_NOISE_FRAGMENT,
			{
				uAmount: { value: settings.amount * 0.01, type: 'f32' },
				uMonochrome: { value: settings.monochrome / 100, type: 'f32' },
				uSeed: { value: settings.seed, type: 'f32' },
				uLinkAlpha: { value: settings.linkAlpha ? 1 : 0, type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.amount <= 0
};

export default definition;