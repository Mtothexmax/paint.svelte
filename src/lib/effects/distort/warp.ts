import type { EffectDefinition, EffectSettings } from '../types';
import { documentAspect, makeGlFilter } from '../shaders';

const STRENGTH = 40;

// Fisheye / barrel warp: the UV space is pulled toward (positive) or away
// from (negative) the focal point, scaled by the squared distance.
const WARP_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform vec2 uCenter;
	uniform float uStrength;
	uniform float uAspect;

	void main()
	{
		vec2 p = (vTextureCoord - uCenter) * vec2(uAspect, 1.0);
		float r2 = dot(p, p);
		float f = 1.0 + uStrength * r2;
		vec2 s = uCenter + f * p / vec2(uAspect, 1.0);
		finalColor = texture(uTexture, s);
	}
`;

const definition: EffectDefinition = {
	label: 'Warp',
	icon: '🌊',
	params: [
		{
			key: 'strength',
			label: 'Strength',
			min: -100,
			max: 100,
			step: 1,
			default: STRENGTH,
			centerTick: true
		},
		// Focal point as a pad (image-space position -> Y runs downward).
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
			WARP_FRAGMENT,
			{
				uCenter: { value: [settings.centerX / 100, settings.centerY / 100], type: 'vec2<f32>' },
				uStrength: { value: settings.strength * 0.004, type: 'f32' },
				uAspect: { value: documentAspect(), type: 'f32' }
			},
			0
		),
	isNoop: (settings: EffectSettings) => settings.strength === 0
};

export default definition;