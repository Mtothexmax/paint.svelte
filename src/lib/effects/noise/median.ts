import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const RADIUS = 3;

// Median filter: a 3×3 grid of taps spread by `radius` texels plus a doubled
// centre tap (so ties lean toward the original pixel) are sorted by
// luminance; the mid sample wins. Cuts salt-and-pepper noise while keeping
// hard edges intact.
const MEDIAN_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uRadius;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.299, 0.587, 0.114));
	}

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 samples[10];
		float lums[10];

		vec4 c0 = texture(uTexture, clamp(vTextureCoord + texel * vec2(-1.0, -1.0) * uRadius, 0.0, 1.0));
		samples[0] = c0;
		lums[0] = lum(c0);
		vec4 c1 = texture(uTexture, clamp(vTextureCoord + texel * vec2(0.0, -1.0) * uRadius, 0.0, 1.0));
		samples[1] = c1;
		lums[1] = lum(c1);
		vec4 c2 = texture(uTexture, clamp(vTextureCoord + texel * vec2(1.0, -1.0) * uRadius, 0.0, 1.0));
		samples[2] = c2;
		lums[2] = lum(c2);
		vec4 c3 = texture(uTexture, clamp(vTextureCoord + texel * vec2(-1.0, 0.0) * uRadius, 0.0, 1.0));
		samples[3] = c3;
		lums[3] = lum(c3);
		vec4 c4 = texture(uTexture, clamp(vTextureCoord + texel * vec2(0.0, 0.0) * uRadius, 0.0, 1.0));
		samples[4] = c4;
		lums[4] = lum(c4);
		vec4 c5 = texture(uTexture, clamp(vTextureCoord + texel * vec2(1.0, 0.0) * uRadius, 0.0, 1.0));
		samples[5] = c5;
		lums[5] = lum(c5);
		vec4 c6 = texture(uTexture, clamp(vTextureCoord + texel * vec2(-1.0, 1.0) * uRadius, 0.0, 1.0));
		samples[6] = c6;
		lums[6] = lum(c6);
		vec4 c7 = texture(uTexture, clamp(vTextureCoord + texel * vec2(0.0, 1.0) * uRadius, 0.0, 1.0));
		samples[7] = c7;
		lums[7] = lum(c7);
		vec4 c8 = texture(uTexture, clamp(vTextureCoord + texel * vec2(1.0, 1.0) * uRadius, 0.0, 1.0));
		samples[8] = c8;
		lums[8] = lum(c8);
		samples[9] = c4;
		lums[9] = lums[4];

		for (int k = 0; k < 9; k++)
		{
			for (int j = 0; j < 9; j++)
			{
				if (lums[j] > lums[j + 1])
				{
					float tl = lums[j];
					lums[j] = lums[j + 1];
					lums[j + 1] = tl;
					vec4 tc = samples[j];
					samples[j] = samples[j + 1];
					samples[j + 1] = tc;
				}
			}
		}
		finalColor = samples[5];
	}
`;

const definition: EffectDefinition = {
	label: 'Median',
	icon: '🧂',
	params: [
		{
			key: 'radius',
			label: 'Radius',
			min: 1,
			max: 10,
			step: 1,
			default: RADIUS
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			MEDIAN_FRAGMENT,
			{ uRadius: { value: settings.radius, type: 'f32' } },
			Math.ceil(settings.radius)
		),
	isNoop: (settings: EffectSettings) => settings.radius <= 1
};

export default definition;