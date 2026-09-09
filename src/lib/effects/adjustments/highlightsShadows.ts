import type { EffectDefinition, EffectSettings } from '../types';
import { ADJUST_GLSL, makeGlFilter } from '../shaders';

// Paint.NET's Highlights / Shadows. Each slider is masked by the pixel's
// luminance (cubed, so the falloff is soft and never reaches the opposite end
// of the range) and then pushes the pixel toward white (positive) or black
// (negative) — shadows act on the dark end, highlights on the bright end.
const HLSH_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uHighlights;
	uniform float uShadows;

${ADJUST_GLSL}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		vec3 rgb = c.rgb;
		float l = luma(rgb);
		float shadowMask = pow(1.0 - l, 3.0);
		float highMask = pow(l, 3.0);

		// u* > 0 lifts toward white, u* < 0 pushes toward black.
		float s = uShadows;
		float h = uHighlights;
		rgb += shadowMask * s * (s > 0.0 ? (1.0 - rgb) : rgb);
		rgb += highMask * h * (h > 0.0 ? (1.0 - rgb) : -rgb);

		finalColor = adjustOutput(rgb, c.a);
	}
`;

const definition: EffectDefinition = {
	label: 'Highlights / Shadows',
	icon: '🌗',
	params: [
		{
			key: 'highlights',
			label: 'Highlights',
			min: -100,
			max: 100,
			step: 1,
			default: 0,
			gradient: 'linear-gradient(90deg, #404040 0%, #808080 50%, #fff 100%)'
		},
		{
			key: 'shadows',
			label: 'Shadows',
			min: -100,
			max: 100,
			step: 1,
			default: 0,
			gradient: 'linear-gradient(90deg, #000 0%, #606060 70%, #b0b0b0 100%)'
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(HLSH_FRAGMENT, {
			uHighlights: { value: settings.highlights / 100, type: 'f32' },
			uShadows: { value: settings.shadows / 100, type: 'f32' }
		}),
	isNoop: (settings: EffectSettings) => settings.highlights === 0 && settings.shadows === 0
};

export default definition;
