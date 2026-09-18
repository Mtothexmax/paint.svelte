import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const ANGLE = 315; // = 90 + 315 = 45 in shader terms: light from the upper left
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
		// Rotation dial. The dial reads 0 = up, clockwise (the AnglePicker
		// convention) and points at the LIGHT. The shader's `d = (cos t, sin t)`
		// is the direction the light TRAVELS (a bump's top edge is lit when d
		// points down), so `d = -dialDir`; with dialDir = (sin D, -cos D) that
		// gives t = 90 + D.
		//
		// Default 315 rather than 45: 90 + 315 = 405 = 45, which is exactly the
		// old shader angle, so the default LOOK is unchanged (light from the
		// upper left). Only the number the dial shows moved, and it now matches
		// where the light comes from.
		{
			key: 'angle',
			label: 'Angle',
			kind: 'angle',
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
				// `90 + angle`: maps the dial's (0 = up, clockwise) onto the
				// shader's (-cos, +sin) light-travel direction.
				uAngle: { value: ((90 + settings.angle) * Math.PI) / 180, type: 'f32' },
				uStrength: { value: 1.5 * (settings.strength / 100) + 0.1, type: 'f32' }
			},
			1
		),
	isNoop: (settings: EffectSettings) => settings.strength <= 0
};

export default definition;