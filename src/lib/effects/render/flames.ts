import type { EffectDefinition, EffectSettings } from '../types';
import { NOISE_GLSL, makeGlFilter } from '../shaders';

const SCALE = 8;
const SEED = 123;

// Fluid heat shimmer: two fBm fields warp the sampling domain, then the value
// is graded along a blue→red ramp that brightens toward the top of the frame.
const FLAMES_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;
${NOISE_GLSL}

	uniform float uScale;
	uniform float uSeed;

	vec3 ramp(float t)
	{
		vec3 blue = vec3(0.05, 0.05, 0.45);
		vec3 mid = vec3(0.9, 0.45, 0.05);
		vec3 yellow = vec3(1.0, 0.95, 0.6);
		vec3 c = mix(blue, mid, smoothstep(0.0, 0.5, t));
		c = mix(c, yellow, smoothstep(0.5, 1.0, t));
		return c;
	}

	void main()
	{
		vec2 p = vTextureCoord * uScale + vec2(uSeed * 0.03, 0.0);
		vec2 q = p + vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
		float n = fbm(q);
		float rise = 1.0 - vTextureCoord.y;
		float t = clamp(n * 1.2 + rise * 0.55 - 0.15, 0.0, 1.0);
		finalColor = vec4(ramp(t), 1.0);
	}
`;

const definition: EffectDefinition = {
	label: 'Flames',
	icon: '🔥',
	params: [
		{
			key: 'scale',
			label: 'Scale',
			min: 1,
			max: 40,
			step: 1,
			default: SCALE
		},
		{
			key: 'seed',
			label: 'Seed',
			min: 0,
			max: 1000,
			step: 1,
			default: SEED
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			FLAMES_FRAGMENT,
			{
				uScale: { value: settings.scale, type: 'f32' },
				uSeed: { value: settings.seed, type: 'f32' }
			},
			0
		),
	isNoop: () => false
};

export default definition;