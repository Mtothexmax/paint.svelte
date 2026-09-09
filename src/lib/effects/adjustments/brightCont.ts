import type { EffectDefinition, EffectSettings } from '../types';
import { ADJUST_GLSL, makeGlFilter } from '../shaders';

// Paint.NET's Brightness / Contrast, ported from the Pinta algorithm the app
// already used: brightness is an offset and contrast pivots each channel
// around the pixel's Rec. 601 intensity, both in the 0..255 byte domain.
// At contrast = +100 the image thresholds to pure black/white; at -100 it
// collapses toward mid grey.
const BRIGHTCONT_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uBrightness;
	uniform float uContrast;

${ADJUST_GLSL}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		float B = uBrightness;
		float C = uContrast;
		float multiply = C < 0.0 ? C + 100.0 : (C > 0.0 ? 100.0 : 1.0);
		float divide = C < 0.0 ? 100.0 : (C > 0.0 ? 100.0 - C : 1.0);

		vec3 v = c.rgb * 255.0;
		float i = luma(v);
		vec3 outRgb;

		if (abs(divide) < 0.5)
		{
			// Maximum contrast: hard threshold against the shifted intensity.
			float t = (i + B) < 128.0 ? 0.0 : 255.0;
			outRgb = vec3(t);
		}
		else
		{
			float shift;
			if (abs(divide - 100.0) < 0.5)
				shift = (i - 127.0) * multiply / divide + 127.0 - i + B;
			else
				shift = (i - 127.0 + B) * multiply / divide + 127.0 - i;
			outRgb = v + shift;
		}

		finalColor = adjustOutput(outRgb / 255.0, c.a);
	}
`;

const definition: EffectDefinition = {
	label: 'Brightness / Contrast',
	icon: '☀️',
	params: [
		{
			key: 'brightness',
			label: 'Brightness',
			min: -100,
			max: 100,
			step: 1,
			default: 0,
			gradient: 'linear-gradient(90deg, #000 0%, #fff 100%)'
		},
		{
			key: 'contrast',
			label: 'Contrast',
			min: -100,
			max: 100,
			step: 1,
			default: 0,
			gradient:
				'linear-gradient(90deg, #808080 0%, #505050 15%, #b0b0b0 30%, #202020 45%, #e0e0e0 60%, #000000 70%, #000000 76%, #ffffff 76%, #ffffff 82%, #000000 82%, #000000 88%, #ffffff 88%, #ffffff 94%, #000000 94%, #000000 100%)'
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(BRIGHTCONT_FRAGMENT, {
			uBrightness: { value: settings.brightness, type: 'f32' },
			uContrast: { value: settings.contrast, type: 'f32' }
		}),
	isNoop: (settings: EffectSettings) => settings.brightness === 0 && settings.contrast === 0
};

export default definition;
