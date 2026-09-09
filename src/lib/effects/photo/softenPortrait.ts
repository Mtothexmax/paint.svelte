import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const STRENGTH = 40;

// Beauty filter: a luminance-preserving gaussian blend whose radius grows
// with `strength`, then re-weights toward the original pixel so skin tones
// smooth out without flattening the whole frame.
const SOFTEN_PORTRAIT_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uStrength;

	void main()
	{
		vec2 texel = uInputSize.zw;
		float r = 1.0 + uStrength * 2.0;
		vec4 c = texture(uTexture, vTextureCoord);

		vec4 acc = vec4(0.0);
		float total = 0.0;
		for (int y = -2; y <= 2; y++)
		{
			for (int x = -2; x <= 2; x++)
			{
				vec2 off = vec2(float(x), float(y)) * texel * r;
				float d = float(x * x + y * y);
				float w = exp(-d * 0.8);
				acc += texture(uTexture, clamp(vTextureCoord + off, 0.0, 1.0)) * w;
				total += w;
			}
		}
		vec4 smooth = acc / max(total, 1e-5);
		vec4 outC = mix(smooth, c, 0.35);
		float sl = dot(smooth.rgb, vec3(0.299, 0.587, 0.114));
		float cl = dot(c.rgb, vec3(0.299, 0.587, 0.114));
		outC.a = c.a;
		finalColor = mix(c, outC, uStrength);
	}
`;

const definition: EffectDefinition = {
	label: 'Soften Portrait',
	icon: '🛁',
	params: [
		{
			key: 'strength',
			label: 'Strength',
			min: 0,
			max: 100,
			step: 1,
			default: STRENGTH
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			SOFTEN_PORTRAIT_FRAGMENT,
			{ uStrength: { value: settings.strength / 100, type: 'f32' } },
			3
		),
	isNoop: (settings: EffectSettings) => settings.strength <= 0
};

export default definition;