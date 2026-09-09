import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

// Object: Bevel — simulates a 3-D edge by sampling the alpha gradient and
// adding highlight toward the light angle and shadow on the opposite side.
// The effect only touches pixels that are on the edge (alpha between 0 and 1
// or neighbours differ).
const BEVEL_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform vec4 uInputSize;
	uniform float uDepth;
	uniform float uAngle;

	void main()
	{
		vec4 c = texture(uTexture, vTextureCoord);
		if (c.a < 0.01)
		{
			finalColor = c;
			return;
		}

		vec2 px = uInputSize.zw;
		float aR = texture(uTexture, vTextureCoord + vec2(px.x, 0.0)).a;
		float aL = texture(uTexture, vTextureCoord - vec2(px.x, 0.0)).a;
		float aU = texture(uTexture, vTextureCoord + vec2(0.0, px.y)).a;
		float aD = texture(uTexture, vTextureCoord - vec2(0.0, px.y)).a;

		float dx = aR - aL;
		float dy = aU - aD;

		// Light direction in radians.
		float rad = radians(uAngle);
		float lx = cos(rad);
		float ly = sin(rad);

		float lighting = (dx * lx + dy * ly) * uDepth;

		if (lighting > 0.0)
			c.rgb = clamp(c.rgb + lighting * vec3(1.0), 0.0, 1.0);
		else
			c.rgb = clamp(c.rgb + lighting * vec3(0.3, 0.3, 0.4), 0.0, 1.0);

		finalColor = c;
	}
`;

const definition: EffectDefinition = {
	label: 'Bevel',
	icon: '🔲',
	params: [
		{
			key: 'depth',
			label: 'Depth',
			min: 0,
			max: 100,
			step: 1,
			default: 20
		},
		{
			key: 'angle',
			label: 'Light Angle',
			min: 0,
			max: 360,
			step: 1,
			default: 135
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(BEVEL_FRAGMENT, {
			uDepth: { value: settings.depth / 100, type: 'f32' },
			uAngle: { value: settings.angle, type: 'f32' }
		}),
	isNoop: (settings: EffectSettings) => settings.depth <= 0
};

export default definition;
