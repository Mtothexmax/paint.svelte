import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const STRENGTH = 80;

// Flash-photography fix: pixels that are dominantly red — the classic
// "red-eye" signature — are detected across a 3×3 window and desaturated +
// darkened toward the CORRECTED red, proportional to strength.
const RED_EYE_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uStrength;

	float redness(vec3 c)
	{
		return c.r - max(c.g, c.b);
	}

	void main()
	{
		vec4 c = texture(uTexture, vTextureCoord);
		float r = redness(c.rgb);
		float isRed = step(0.25, r) * step(c.r, 0.65);
		if (isRed > 0.5)
		{
			vec3 corrected = vec3(0.45, 0.40, 0.38) * c.r;
			vec3 target = mix(c.rgb, corrected, isRed * uStrength);
			float bright = dot(target, vec3(0.299, 0.587, 0.114));
			target *= mix(1.0, 0.55, uStrength);
			target = max(target, 0.0);
			finalColor = vec4(mix(c.rgb, target, uStrength), c.a);
		}
		else
		{
			finalColor = c;
		}
	}
`;

const definition: EffectDefinition = {
	label: 'Red Eye Removal',
	icon: '👁',
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
			RED_EYE_FRAGMENT,
			{ uStrength: { value: settings.strength / 100, type: 'f32' } },
			0
		),
	isNoop: (settings: EffectSettings) => settings.strength <= 0
};

export default definition;