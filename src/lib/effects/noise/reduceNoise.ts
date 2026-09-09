import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const AMOUNT = 40;
const THRESHOLD = 12;

// Edge-preserving noise reducer: a pixel keeps its value at strong
// luminance transitions (edges) but blends toward its smooth neighbourhood
// average when neighbouring luminance stays within `threshold`.
const REDUCE_NOISE_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAmount;
	uniform float uThreshold;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.299, 0.587, 0.114));
	}

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 center = texture(uTexture, vTextureCoord);
		float cl = lum(center);

		float w = 0.0;
		vec4 acc = vec4(0.0);
		for (int gy = -1; gy <= 1; gy++)
		{
			for (int gx = -1; gx <= 1; gx++)
			{
				if (gx == 0 && gy == 0) continue;
				vec2 off = vec2(float(gx), float(gy)) * texel;
				vec4 c = texture(uTexture, clamp(vTextureCoord + off, 0.0, 1.0));
				float d = abs(lum(c) - cl);
				if (d < uThreshold)
				{
					acc += c;
					w += 1.0;
				}
			}
		}
		vec4 smooth = (center + acc) / (1.0 + w);
		finalColor = mix(center, smooth, uAmount);
	}
`;

const definition: EffectDefinition = {
	label: 'Reduce Noise',
	icon: '🧹',
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
			key: 'threshold',
			label: 'Threshold',
			min: 0,
			max: 100,
			step: 1,
			default: THRESHOLD
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			REDUCE_NOISE_FRAGMENT,
			{
				uAmount: { value: settings.amount / 100, type: 'f32' },
				uThreshold: { value: settings.threshold * 0.004, type: 'f32' }
			},
			1
		),
	isNoop: (settings: EffectSettings) => settings.amount <= 0
};

export default definition;