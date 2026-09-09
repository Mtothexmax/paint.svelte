import type { EffectDefinition, EffectSettings } from '../types';
import { ADJUST_GLSL, makeGlFilter } from '../shaders';

// Paint.NET's Exposure: a photographic stop adjustment, v' = v * 2^EV.
const EXPOSURE_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uExposure;

${ADJUST_GLSL}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}
		finalColor = adjustOutput(c.rgb * exp2(uExposure), c.a);
	}
`;

const definition: EffectDefinition = {
	label: 'Exposure',
	icon: '📷',
	params: [
		{
			key: 'exposure',
			label: 'Exposure',
			min: -5,
			max: 5,
			step: 0.1,
			default: 0,
			gradient: 'linear-gradient(90deg, #000 0%, #808080 50%, #fff 100%)'
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(EXPOSURE_FRAGMENT, {
			uExposure: { value: settings.exposure, type: 'f32' }
		}),
	isNoop: (settings: EffectSettings) => settings.exposure === 0
};

export default definition;
