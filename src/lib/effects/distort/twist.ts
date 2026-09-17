import type { EffectDefinition, EffectSettings } from '../types';
import { documentAspect, makeGlFilter } from '../shaders';

const ANGLE = 45;
const CENTER_X = 50;
const CENTER_Y = 50;

// Twirl / whirlpool: the UV space rotates by an amount that ramps up from
// zero at the frame edge to peak at the focal point.
const TWIST_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uAngle;
	uniform float uAspect;

	void main()
	{
		vec2 p = (vTextureCoord - uCenter) * vec2(uAspect, 1.0);
		float r = length(p);
		const float radius = 0.5;
		float t = clamp(1.0 - r / (radius * 0.5), 0.0, 1.0);
		t = t * t;
		float a = atan(p.y, p.x) + uAngle * t;
		vec2 s = uCenter + vec2(cos(a), sin(a)) * r / vec2(uAspect, 1.0);
		finalColor = texture(uTexture, s);
	}
`;

const definition: EffectDefinition = {
	label: 'Twist',
	icon: '🌀',
	params: [
		// Symmetric, full-circle range so the dial can be dragged all the way
		// round: the sign is the direction of the twist. (The old -360..360
		// span is twice what a dial can express, and the dial could only reach
		// its positive half.)
		{
			key: 'angle',
			label: 'Angle',
			kind: 'angle',
			min: -180,
			max: 180,
			step: 1,
			default: ANGLE
		},
		{
			key: 'center',
			label: 'Center',
			kind: 'xy',
			minX: 0,
			maxX: 100,
			minY: 0,
			maxY: 100,
			step: 1,
			default: CENTER_X,
			defaultY: CENTER_Y,
			yDown: true
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			TWIST_FRAGMENT,
			{
				uCenter: {
					value: [settings.centerX / 100, settings.centerY / 100],
					type: 'vec2<f32>'
				},
				uAngle: { value: (settings.angle * Math.PI) / 180, type: 'f32' },
				uAspect: { value: documentAspect(), type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.angle === 0
};

export default definition;