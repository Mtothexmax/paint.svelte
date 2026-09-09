import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const RADIUS = 8;
const BRIGHTNESS = 40;

// Soft additive halo: samples concentric ring taps scaled by `radius` texels
// and brightens them, laying a bloom over the scene like a light glow.
const GLOW_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uRadius;
	uniform float uBrightness;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 c = texture(uTexture, vTextureCoord);
		const int N = 8;
		vec4 acc = vec4(0.0);
		float total = 0.0;
		for (int i = 0; i < N; i++)
		{
			float a = float(i) * 6.28318 / float(N);
			vec2 dir = vec2(cos(a), sin(a));
			vec2 uv = vTextureCoord + dir * uRadius * texel;
			float w = 1.0 - float(i) / float(N);
			acc += texture(uTexture, clamp(uv, 0.0, 1.0)) * w;
			total += w;
		}
		vec4 glow = acc / max(total, 1e-5);
		finalColor = c + (glow - c) * uBrightness + glow * uBrightness * 0.5;
	}
`;

const definition: EffectDefinition = {
	label: 'Glow',
	icon: '💡',
	params: [
		{
			key: 'radius',
			label: 'Radius',
			min: 1,
			max: 50,
			step: 1,
			default: RADIUS
		},
		{
			key: 'brightness',
			label: 'Brightness',
			min: 0,
			max: 100,
			step: 1,
			default: BRIGHTNESS
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			GLOW_FRAGMENT,
			{
				uRadius: { value: settings.radius, type: 'f32' },
				uBrightness: { value: settings.brightness / 100, type: 'f32' }
			},
			Math.ceil(settings.radius)
		),
	isNoop: (settings: EffectSettings) => settings.brightness <= 0
};

export default definition;