import type { EffectDefinition, EffectSettings } from '../types';
import { NOISE_GLSL, makeGlFilter } from '../shaders';

const SCALE = 4;
const SEED = 123;

// Twisting vortices: two orthogonal fBm fields displace the sampling domain
// ("Perlin-warped fBm"), producing a deterministic turbulent overturn.
const TURBULENCE_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;
${NOISE_GLSL}

	uniform float uScale;
	uniform float uSeed;

	void main()
	{
		vec2 warp = vTextureCoord * (uScale * 3.0) + vec2(uSeed * 0.05, 0.0);
		vec2 off = vec2(fbm(warp), fbm(warp + vec2(6.3, 4.1))) - 0.5;
		vec2 q = vTextureCoord + off * (0.35 / uScale);
		float n = fbm(q * uScale + vec2(uSeed * 0.05, 0.0));
		vec3 col = vec3(0.45) + n * vec3(0.0, 0.15, 0.3);
		finalColor = vec4(col * (0.6 + 0.4 * n), 1.0);
	}
`;

const definition: EffectDefinition = {
	label: 'Turbulence',
	icon: '🌪',
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
			TURBULENCE_FRAGMENT,
			{
				uScale: { value: settings.scale, type: 'f32' },
				uSeed: { value: settings.seed, type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.scale <= 1
};

export default definition;