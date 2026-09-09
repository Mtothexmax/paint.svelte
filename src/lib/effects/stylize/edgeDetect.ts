import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const STRENGTH = 60;

// Robert's cross gradient: the 2×2 slope magnitude marks edges, rendered as
// luminous lines whose intensity scales with `strength`.
const EDGE_DETECT_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uStrength;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.299, 0.587, 0.114));
	}

	void main()
	{
		vec2 t = uInputSize.zw;
		float a = lum(texture(uTexture, vTextureCoord + vec2(-t.x, -t.y)));
		float b = lum(texture(uTexture, vTextureCoord + vec2(t.x, -t.y)));
		float c = lum(texture(uTexture, vTextureCoord + vec2(-t.x, t.y)));
		float d = lum(texture(uTexture, vTextureCoord + vec2(t.x, t.y)));
		float gx = a - d;
		float gy = c - b;
		float mag = length(vec2(gx, gy));
		float e = clamp(mag * 5.0 * uStrength, 0.0, 1.0);
		vec3 col = vec3(1.0, 1.0, 1.0) * e * 0.9 + vec3(e);
		finalColor = vec4(col * e, 1.0);
	}
`;

const definition: EffectDefinition = {
	label: 'Edge Detect',
	icon: '🔲',
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
			EDGE_DETECT_FRAGMENT,
			{ uStrength: { value: settings.strength * 0.01 + 0.05, type: 'f32' } },
			1
		),
	isNoop: (settings: EffectSettings) => settings.strength <= 0
};

export default definition;