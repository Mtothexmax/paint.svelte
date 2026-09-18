import type { EffectDefinition, EffectSettings } from '../types';
import { ADJUST_GLSL, makeGlFilter } from '../shaders';

// Paint.NET Posterize: round each channel to N discrete levels (N =
// "Colors per channel"). Formula: v' = round(v * (n-1)) / (n-1).
// The shader replicates the rounding in straight colour space and then
// re-premultiplies.
const POSTERIZE_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uLevels;

${ADJUST_GLSL}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		float n = max(uLevels, 2.0);
		vec3 v = floor(c.rgb * (n - 1.0) + 0.5) / (n - 1.0);
		finalColor = adjustOutput(v, c.a);
	}
`;

const definition: EffectDefinition = {
	label: 'Posterize',
	icon: '🎚',
	params: [
		{
			key: 'levels',
			label: 'Colors per channel',
			min: 2,
			// 256, not 255: the formula is round(v * (n-1)) / (n-1), which is an
			// exact identity for 8-bit input only when n-1 = 255, i.e. n = 256.
			// At 255 the rounding lands on 254 buckets and shifts some channels
			// by one LSB. The isNoop guard below already tests for 256, so with a
			// max of 255 it was unreachable dead code and Apply was never
			// disabled — the top of the range silently did nothing useful.
			max: 256,
			step: 1,
			default: 16
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(POSTERIZE_FRAGMENT, {
			uLevels: { value: settings.levels, type: 'f32' }
		}),
	isNoop: (settings: EffectSettings) => settings.levels >= 256
};

export default definition;
