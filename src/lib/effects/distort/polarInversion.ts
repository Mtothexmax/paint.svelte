import type { EffectDefinition, EffectSettings } from '../types';
import { documentAspect, makeGlFilter } from '../shaders';

// Maps the image into polar coordinates around the centre and flips the
// radius (r′ = maxR − r), collapsing the edges into the middle.
const POLAR_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAspect;

	void main()
	{
		vec2 p = (vTextureCoord - vec2(0.5)) * vec2(uAspect, 1.0);
		float r = length(p);
		if (r < 1e-5)
		{
			finalColor = texture(uTexture, vTextureCoord);
			return;
		}
		float maxR = length(vec2(0.5 * uAspect, 0.5));
		float a = atan(p.y, p.x);
		float r2 = clamp(maxR - r, 0.0, maxR);
		vec2 q = vec2(cos(a), sin(a)) * r2 / vec2(uAspect, 1.0) + vec2(0.5);
		finalColor = texture(uTexture, clamp(q, 0.0, 1.0));
	}
`;

const definition: EffectDefinition = {
	label: 'Polar Inversion',
	icon: '🌐',
	params: [],
	filter: (settings: EffectSettings) =>
		makeGlFilter(POLAR_FRAGMENT, { uAspect: { value: documentAspect(), type: 'f32' } }, 0),
	isNoop: () => false
};

export default definition;