import type { EffectDefinition, EffectSettings } from '../types';
import { ADJUST_GLSL, makeGlFilter } from '../shaders';

// Paint.NET Threshold: each pixel becomes pure black or white depending on
// whether its Rec. 601 luminance is above or below the threshold. Threshold
// is supplied in the 0..255 byte domain and compared against luma*255.
const THRESHOLD_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform float uThreshold;

${ADJUST_GLSL}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		float i = luma(c.rgb) * 255.0;
		float v = i >= uThreshold ? 1.0 : 0.0;
		finalColor = adjustOutput(vec3(v), c.a);
	}
`;

const definition: EffectDefinition = {
	label: 'Threshold',
	icon: '◾',
	params: [
		{
			key: 'threshold',
			label: 'Threshold',
			min: 0,
			max: 255,
			step: 1,
			default: 128,
			gradient: 'linear-gradient(90deg, #000 0%, #fff 100%)'
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(THRESHOLD_FRAGMENT, {
			uThreshold: { value: settings.threshold, type: 'f32' }
		}),
	isNoop: () => false
};

export default definition;
