import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const SCALE = 5;
const CONTRAST = 50;
const GRAINYNESS = 40;
const SEED = 123;

// Puffy cloud field (fBm replaces the sheet), with no aspect-ratio
// stretching so cells stay round. The seed feeds the hash itself (a new
// seed ⇒ a new pattern); "Shift" slides the field sideways; "Grainyness"
// (paint.net Roughness) blends in high-frequency detail.
const CLOUDS_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform float uScale;
	uniform float uContrast;
	uniform float uGrain;
	uniform float uSeed;
	uniform float uShift;

	float hash(vec2 p)
	{
		return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 123.457) * 43758.5453123);
	}

	float valueNoise(vec2 p)
	{
		vec2 i = floor(p);
		vec2 f = fract(p);
		vec2 u = f * f * (3.0 - 2.0 * f);
		float a = hash(i);
		float b = hash(i + vec2(1.0, 0.0));
		float c = hash(i + vec2(0.0, 1.0));
		float d = hash(i + vec2(1.0, 1.0));
		return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
	}

	float fbm(vec2 p)
	{
		float v = 0.0;
		float amp = 0.5;
		for (int i = 0; i < 4; i++)
		{
			v += amp * valueNoise(p);
			p *= 2.02;
			amp *= 0.5;
		}
		return v;
	}

	void main()
	{
		vec2 p = vTextureCoord * uScale + vec2(uShift, 0.0);
		float smooth0 = valueNoise(p);
		float detailed = fbm(p);
		float n = mix(smooth0, detailed, 0.5 + 0.45 * min(uGrain, 1.0));
		n += (valueNoise(p * 4.0) - 0.5) * uGrain * 0.22;
		n += (valueNoise(p * 8.0) - 0.5) * uGrain * 0.18;
		n = clamp((n - 0.5) * uContrast + 0.5, 0.0, 1.0);
		vec3 col = vec3(0.62, 0.65, 0.72) + n * vec3(0.38, 0.35, 0.28);
		finalColor = vec4(col, 1.0);
	}
`;

const definition: EffectDefinition = {
	label: 'Clouds',
	icon: '☁️',
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
			key: 'contrast',
			label: 'Contrast',
			min: 0,
			max: 100,
			step: 1,
			default: CONTRAST
		},
		{
			key: 'grainyness',
			label: 'Grainyness',
			min: 0,
			max: 400,
			step: 1,
			default: GRAINYNESS
		},
		{
			key: 'seed',
			label: 'Seed',
			min: 0,
			max: 1000,
			step: 1,
			default: SEED
		},
		{
			key: 'shift',
			label: 'Shift',
			min: 0,
			max: 100,
			step: 1,
			default: 0
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			CLOUDS_FRAGMENT,
			{
				uScale: { value: settings.scale, type: 'f32' },
				uContrast: { value: settings.contrast * 0.03 + 0.6, type: 'f32' },
				uGrain: { value: settings.grainyness / 100, type: 'f32' },
				uSeed: { value: settings.seed, type: 'f32' },
				uShift: { value: settings.shift * 0.04, type: 'f32' }
			},
			0
		),
	// A render effect always replaces the pixels it covers, and even at
	// Contrast 0 the shader still emits a cloud field — so there is no
	// no-op setting (same as Flames).
	isNoop: () => false
};

export default definition;