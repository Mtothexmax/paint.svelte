import type { EffectDefinition, EffectSettings } from '../types';
import { ADJUST_GLSL, makeGlFilter } from '../shaders';

// Paint.NET's Levels: input black point / white point / gamma, then an output
// black point / white point. Gamma is expressed as 1/100ths (100 = 1.0) so the
// slider stays integral, and applied as an exponent of 1/gamma — the same
// convention as Paint.NET's gamma slider.
const LEVELS_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform vec3 uInLo;
	uniform vec3 uInHi;
	uniform vec3 uOutLo;
	uniform vec3 uOutHi;
	uniform float uGamma;
	uniform vec3 uMask;

${ADJUST_GLSL}

	void main()
	{
		vec4 c = adjustSample(uTexture, vTextureCoord);
		if (c.a <= 0.0)
		{
			finalColor = vec4(0.0);
			return;
		}

		vec3 span = max(uInHi - uInLo, vec3(1.0 / 255.0));
		vec3 v = clamp((c.rgb - uInLo) / span, 0.0, 1.0);
		v = pow(v, vec3(1.0 / max(uGamma, 0.01)));
		vec3 mapped = uOutLo + v * (uOutHi - uOutLo);
		// Per-channel mask: unchecked channels pass through untouched.
		vec3 res = mix(c.rgb, mapped, uMask);

		finalColor = adjustOutput(res, c.a);
	}
`;

const definition: EffectDefinition = {
	label: 'Levels',
	icon: '📊',
	// Opens the dedicated Paint.NET-style Levels dialog instead of the
	// generic slider sheet.
	dialog: 'levels',
	params: [
		{ key: 'inBlack', label: 'Input Black', min: 0, max: 254, step: 1, default: 0 },
		{ key: 'inWhite', label: 'Input White', min: 1, max: 255, step: 1, default: 255 },
		{ key: 'gamma', label: 'Gamma (×100)', min: 1, max: 1000, step: 1, default: 100 },
		{ key: 'outBlack', label: 'Output Black', min: 0, max: 255, step: 1, default: 0 },
		{ key: 'outWhite', label: 'Output White', min: 0, max: 255, step: 1, default: 255 },
		{ key: 'chR', label: 'Red channel', min: 0, max: 1, step: 1, default: 1, kind: 'checkbox' },
		{ key: 'chG', label: 'Green channel', min: 0, max: 1, step: 1, default: 1, kind: 'checkbox' },
		{ key: 'chB', label: 'Blue channel', min: 0, max: 1, step: 1, default: 1, kind: 'checkbox' }
	],
	filter: (settings: EffectSettings) => {
		const lo = settings.inBlack / 255;
		const hi = settings.inWhite / 255;
		return makeGlFilter(LEVELS_FRAGMENT, {
			uInLo: { value: [lo, lo, lo], type: 'vec3<f32>' },
			uInHi: { value: [hi, hi, hi], type: 'vec3<f32>' },
			uOutLo: {
				value: [settings.outBlack / 255, settings.outBlack / 255, settings.outBlack / 255],
				type: 'vec3<f32>'
			},
			uOutHi: {
				value: [settings.outWhite / 255, settings.outWhite / 255, settings.outWhite / 255],
				type: 'vec3<f32>'
			},
			uGamma: { value: settings.gamma / 100, type: 'f32' },
			uMask: {
				value: [settings.chR ?? 1, settings.chG ?? 1, settings.chB ?? 1],
				type: 'vec3<f32>'
			}
		});
	},
	isNoop: (settings: EffectSettings) => {
		const identity =
			settings.inBlack === 0 &&
			settings.inWhite === 255 &&
			settings.gamma === 100 &&
			settings.outBlack === 0 &&
			settings.outWhite === 255;
		const allOff = (settings.chR ?? 1) === 0 && (settings.chG ?? 1) === 0 && (settings.chB ?? 1) === 0;
		return identity || allOff;
	}
};

export default definition;
