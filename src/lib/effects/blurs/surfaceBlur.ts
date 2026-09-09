import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const RADIUS = 5;
const THRESHOLD = 20;

// Weighted by per-channel colour distance with a smooth linear falloff:
// each neighbour contributes weight max(0, 1 - d/threshold), so similarly
// coloured areas blur together while colour discontinuities stay intact.
const SURFACE_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uRadius;
	uniform float uThreshold;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 center = texture(uTexture, vTextureCoord);
		vec3 c0 = center.rgb;

		const int maxR = 10;
		vec4 acc = vec4(0.0);
		float wsum = 0.0;
		for (int x = -maxR; x <= maxR; x++)
		{
			if (abs(float(x)) > uRadius) continue;
			for (int y = -maxR; y <= maxR; y++)
			{
				if (abs(float(y)) > uRadius) continue;
				vec4 c = texture(uTexture, vTextureCoord + vec2(float(x), float(y)) * texel);
				float d = max(abs(c.r - c0.r), max(abs(c.g - c0.g), abs(c.b - c0.b)));
				float w = clamp(1.0 - d / uThreshold, 0.0, 1.0);
				acc += c * w;
				wsum += w;
			}
		}
		finalColor = wsum > 0.0 ? acc / wsum : center;
	}
`;

const definition: EffectDefinition = {
	label: 'Surface Blur',
	icon: '🌊',
	params: [
		{
			key: 'radius',
			label: 'Radius',
			min: 1,
			max: 10,
			step: 1,
			default: RADIUS
		},
		{
			key: 'threshold',
			label: 'Threshold',
			min: 1,
			max: 100,
			step: 1,
			default: THRESHOLD
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			SURFACE_FRAGMENT,
			{
				uRadius: { value: settings.radius, type: 'f32' },
				uThreshold: { value: settings.threshold / 100, type: 'f32' }
			},
			Math.ceil(settings.radius)
		),
	isNoop: (settings: EffectSettings) => settings.radius <= 0
};

export default definition;