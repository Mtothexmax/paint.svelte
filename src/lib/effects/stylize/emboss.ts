import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const ANGLE = 45;
const STRENGTH = 70;

// Bevel: samples in front of and behind the direction of light, subtracting
// them to raise/sink the relief. The grayscale range is centred on 0.5.
const EMBOSS_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAngle;
	uniform float uStrength;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.299, 0.587, 0.114));
	}

	void main()
	{
		vec2 t = uInputSize.zw;
		vec2 d = vec2(cos(uAngle), sin(uAngle));
		float hi = lum(texture(uTexture, vTextureCoord + d * t));
		float lo = lum(texture(uTexture, vTextureCoord - d * t));
		float e = (hi - lo) * uStrength + 0.5;
		finalColor = vec4(vec3(clamp(e, 0.0, 1.0)), 1.0);
	}
`;

const definition: EffectDefinition = {
	label: 'Emboss',
	icon: '🏔',
	params: [
		{
			key: 'angle',
			label: 'Angle',
			min: 0,
			max: 360,
			step: 1,
			default: ANGLE
		},
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
			EMBOSS_FRAGMENT,
			{
				uAngle: { value: (settings.angle * Math.PI) / 180, type: 'f32' },
				uStrength: { value: 1.5 * (settings.strength / 100) + 0.1, type: 'f32' }
			},
			1
		),
	isNoop: (settings: EffectSettings) => settings.strength <= 0
};

export default definition;