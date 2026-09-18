import type { EffectDefinition, EffectSettings } from '../types';
import { documentAspect, makeGlFilter } from '../shaders';

// Maps the image into polar coordinates around the centre and flips the
// radius (r′ = maxR − r), collapsing the edges into the middle.
const POLAR_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAspect;
	uniform vec2 uCenter;

	void main()
	{
		vec2 p = (vTextureCoord - uCenter) * vec2(uAspect, 1.0);
		float r = length(p);
		if (r < 1e-5)
		{
			finalColor = texture(uTexture, vTextureCoord);
			return;
		}
		// Half-diagonal of the frame: a scale, not a strict bound (r2 is clamped
		// below), so it stays sensible when the centre is moved off the middle.
		float maxR = length(vec2(0.5 * uAspect, 0.5));
		float a = atan(p.y, p.x);
		float r2 = clamp(maxR - r, 0.0, maxR);
		vec2 q = vec2(cos(a), sin(a)) * r2 / vec2(uAspect, 1.0) + uCenter;
		finalColor = texture(uTexture, clamp(q, 0.0, 1.0));
	}
`;

const definition: EffectDefinition = {
	label: 'Polar Inversion',
	icon: '🌐',
	// The centre used to be hard-wired to the middle of the frame. It is a pad
	// now, like every other radial effect (Bulge / Warp / Smudge / Twist): the
	// default 50/50 is exactly the old behaviour.
	params: [
		{
			key: 'center',
			label: 'Center',
			kind: 'xy',
			minX: 0,
			maxX: 100,
			minY: 0,
			maxY: 100,
			step: 1,
			default: 50,
			defaultY: 50,
			yDown: true
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			POLAR_FRAGMENT,
			{
				uAspect: { value: documentAspect(), type: 'f32' },
				uCenter: {
					value: [settings.centerX / 100, settings.centerY / 100],
					type: 'vec2<f32>'
				}
			},
			0
		),
	isNoop: () => false
};

export default definition;