import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const ANGLE = 90;
const DISTANCE = 30;

const UTIL_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;
`;

const MOTION_FRAGMENT = `
${UTIL_FRAGMENT}
	uniform float uAngle;
	uniform float uDistance;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec2 dir = vec2(cos(uAngle), sin(uAngle));
		vec2 stepPx = dir * uDistance * texel * (1.0 / 12.0);

		vec4 acc = vec4(0.0);
		for (int i = -6; i <= 6; i++)
		{
			acc += texture(uTexture, vTextureCoord + stepPx * float(i));
		}
		finalColor = acc / 13.0;
	}
`;

const definition: EffectDefinition = {
	label: 'Motion Blur',
	icon: '🎞️',
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
			key: 'distance',
			label: 'Distance',
			min: 0,
			max: 100,
			step: 1,
			default: DISTANCE
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			MOTION_FRAGMENT,
			{
				uAngle: { value: (settings.angle * Math.PI) / 180, type: 'f32' },
				uDistance: { value: settings.distance, type: 'f32' }
			},
			Math.ceil(settings.distance / 2)
		),
	isNoop: (settings: EffectSettings) => settings.distance <= 0
};

export default definition;