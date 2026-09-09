import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const RADIUS = 10;
const TAPS = 24;

// Bokeh-style circular disc kernel (picket-fence distributed) so the blur
// reads as soft lens defocus rather than a plain gaussian.
const OFFSETS: string[] = [];
for (let i = 0; i < TAPS; i++) {
	const t = (i / TAPS) * Math.PI * 2;
	const r = 0.5 * Math.sqrt((i + 0.5) / TAPS);
	OFFSETS.push(`vec2(${r * Math.cos(t)},${r * Math.sin(t)})`);
}

// GLSL ES 1.00 (WebGL1 fallback) has no array constructors, so the disc taps
// are unrolled as plain accumulation lines.
const TAP_SAMPLES = OFFSETS.map(
	(o) => `acc += texture(uTexture, vTextureCoord + ${o} * uRadius * texel);`
).join('\n\t\t');

const UNFOCUS_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uRadius;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 acc = vec4(0.0);
		${TAP_SAMPLES}
		finalColor = acc / ${TAPS}.0;
	}
`;

const definition: EffectDefinition = {
	label: 'Unfocus',
	icon: '🔮',
	params: [
		{
			key: 'radius',
			label: 'Radius',
			min: 0,
			max: 50,
			step: 1,
			default: RADIUS
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			UNFOCUS_FRAGMENT,
			{ uRadius: { value: settings.radius, type: 'f32' } },
			Math.ceil(settings.radius)
		),
	isNoop: (settings: EffectSettings) => settings.radius <= 0
};

export default definition;