import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const RADIUS = 5;
const THRESHOLD = 20;

// Edge-preserving blur: averages neighbours whose luminance differs from the
// centre pixel by less than `threshold`, so edges stay sharp while flat areas
// smooth out. Fixed 21x21 kernel (radius clamped to 10 internally).
const SMART_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uRadius;
	uniform float uThreshold;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
	}

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 center = texture(uTexture, vTextureCoord);
		float centerLum = lum(center);

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
				float w = abs(lum(c) - centerLum) < uThreshold ? 1.0 : 0.0;
				acc += c * w;
				wsum += w;
			}
		}
		finalColor = wsum > 0.0 ? acc / wsum : center;
	}
`;

const definition: EffectDefinition = {
	label: 'Smart Blur',
	icon: '🧠',
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
			min: 0,
			max: 100,
			step: 1,
			default: THRESHOLD
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			SMART_FRAGMENT,
			{
				uRadius: { value: settings.radius, type: 'f32' },
				uThreshold: { value: settings.threshold / 100, type: 'f32' }
			},
			Math.ceil(settings.radius)
		),
	isNoop: (settings: EffectSettings) => settings.radius <= 0 || settings.threshold <= 0
};

export default definition;