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
		// The dial traverses a full circle, so the range is the symmetric one it
		// can actually reach. This is not a behaviour change: the shader
		// averages over the arc `[-angle/2, +angle/2]`, which is the same set of
		// samples for +a and -a.
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
			default: 50,
			defaultY: 50,
			yDown: true
		}
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
	isNoop: (settings: EffectSettings) => settings.angle === 0
};

export default definition;