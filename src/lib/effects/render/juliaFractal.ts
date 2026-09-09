import type { EffectDefinition, EffectSettings } from '../types';
import { documentAspect, makeGlFilter } from '../shaders';

const ITERATIONS = 64;
const ZOOM = 1;
const CENTER_X = 50;
const CENTER_Y = 50;

// Escape-time Julia set (c = -0.8 + 0.156i): the viewport is normalised to
// the document aspect and centred on the chosen point, then every pixel is
// coloured by how quickly its orbit escapes the bounding circle.
const JULIA_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform float uIterations;
	uniform float uZoom;
	uniform vec2 uCenter;
	uniform float uAspect;

	void main()
	{
		vec2 p = (vTextureCoord - vec2(0.5)) * vec2(uAspect, 1.0) / uZoom + uCenter;
		vec2 z = p;
		const vec2 c = vec2(-0.8, 0.156);
		int iters = 0;
		for (int i = 0; i < 150; i++)
		{
			if (dot(z, z) > 4.0) break;
			z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
			iters = i + 1;
		}
		float t = clamp(float(iters) / uIterations, 0.0, 1.0);
		vec3 col = mix(vec3(0.02, 0.02, 0.08), vec3(0.95, 0.55, 0.15), sqrt(t));
		col = mix(col, vec3(0.2, 0.0, 0.55), t * t);
		finalColor = vec4(col, 1.0);
	}
`;

const definition: EffectDefinition = {
	label: 'Julia Fractal',
	icon: '🌀',
	params: [
		{
			key: 'iterations',
			label: 'Iterations',
			min: 1,
			max: 150,
			step: 1,
			default: ITERATIONS
		},
		{
			key: 'zoom',
			label: 'Zoom',
			min: 1,
			max: 200,
			step: 1,
			default: ZOOM
		},
		{ key: 'centerX', label: 'Center X', min: -100, max: 100, step: 1, default: CENTER_X },
		{ key: 'centerY', label: 'Center Y', min: -100, max: 100, step: 1, default: CENTER_Y }
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			JULIA_FRAGMENT,
			{
				uIterations: { value: settings.iterations, type: 'f32' },
				uZoom: { value: settings.zoom, type: 'f32' },
				uCenter: {
					value: [settings.centerX / 100, settings.centerY / 100],
					type: 'vec2<f32>'
				},
				uAspect: { value: documentAspect(), type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.iterations <= 1
};

export default definition;