import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const ANGLE = 10;

const ROTARY_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uAngle;

	void main()
	{
		vec2 p = vTextureCoord - uCenter;
		float r = length(p);
		if (r < 1e-5)
		{
			finalColor = texture(uTexture, vTextureCoord);
			return;
		}
		float base = atan(p.y, p.x);

		vec4 acc = vec4(0.0);
		for (int i = 0; i < 24; i++)
		{
			float t = float(i) / 23.0 - 0.5;
			float a = base + uAngle * t;
			vec2 samplePix = uCenter + vec2(cos(a), sin(a)) * r;
			acc += texture(uTexture, samplePix);
		}
		finalColor = acc / 24.0;
	}
`;

const definition: EffectDefinition = {
	label: 'Rotary Blur',
	icon: '🌀',
	params: [
		{
			key: 'angle',
			label: 'Angle',
			min: 0,
			max: 180,
			step: 1,
			default: ANGLE
		},
		{ key: 'centerX', label: 'Center X', min: 0, max: 100, step: 1, default: 50 },
		{ key: 'centerY', label: 'Center Y', min: 0, max: 100, step: 1, default: 50 }
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			ROTARY_FRAGMENT,
			{
				uCenter: { value: [settings.centerX / 100, settings.centerY / 100], type: 'vec2<f32>' },
				uAngle: { value: (settings.angle * Math.PI) / 180, type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.angle <= 0
};

export default definition;