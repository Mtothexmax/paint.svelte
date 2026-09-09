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
		{
			key: 'angle',
			label: 'Angle',
			min: -360,
			max: 360,
			step: 1,
			default: ANGLE
		},
		{ key: 'centerX', label: 'Center X', min: 0, max: 100, step: 1, default: CENTER_X },
		{ key: 'centerY', label: 'Center Y', min: 0, max: 100, step: 1, default: CENTER_Y }
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