import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const ANGLE = 45;
const STRENGTH = 80;

// Stone bas-relief: the local surface normals are recovered from the
// luminance gradient (4-tap central difference), then re-lit from the chosen
// azimuth. Flat areas slide toward neutral grey.
const RELIEF_FRAGMENT = `
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
		float l00 = lum(texture(uTexture, vTextureCoord + vec2(-t.x, -t.y)));
		float l10 = lum(texture(uTexture, vTextureCoord + vec2(t.x, -t.y)));
		float l01 = lum(texture(uTexture, vTextureCoord + vec2(-t.x, t.y)));
		float l11 = lum(texture(uTexture, vTextureCoord + vec2(t.x, t.y)));
		float dlx = (l10 + l11 - l00 - l01) * 0.5;
		float dly = (l01 + l11 - l00 - l10) * 0.5;

		vec3 n = normalize(vec3(-dlx * uStrength, -dly * uStrength, 1.0));
		vec3 lightDir = normalize(vec3(cos(uAngle), sin(uAngle), 0.6));
		float shade = dot(n, lightDir) * 0.5 + 0.5;
		float base = clamp(0.55 + shade * 0.45, 0.0, 1.0);
		finalColor = vec4(vec3(base * 0.72, base * 0.70, base * 0.66), 1.0);
	}
`;

const definition: EffectDefinition = {
	label: 'Relief',
	icon: '🗿',
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
			RELIEF_FRAGMENT,
			{
				uAngle: { value: (settings.angle * Math.PI) / 180, type: 'f32' },
				uStrength: { value: 0.08 + 2.6 * (settings.strength / 100), type: 'f32' }
			},
			1
		),
	isNoop: (settings: EffectSettings) => settings.strength <= 0
};

export default definition;