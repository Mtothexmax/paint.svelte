import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

// Object: Outline — draws a coloured stroke around the opaque pixels of the
// layer. Works by sampling the alpha channel in a square kernel; any
// transparent pixel that has an opaque neighbour within `radius` texels is
// coloured with the outline colour.
const OUTLINE_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform vec4 uInputSize;
	uniform float uRadius;
	uniform vec3 uColor;
	uniform float uIntensity;

	void main()
	{
		vec4 original = texture(uTexture, vTextureCoord);
		if (original.a >= 0.01)
		{
			finalColor = original;
			return;
		}

		vec2 px = uInputSize.zw;
		float found = 0.0;
		float r = min(uRadius, 20.0);

		for (int x = -20; x <= 20; x++)
		{
			if (float(abs(x)) > r) continue;
			for (int y = -20; y <= 20; y++)
			{
				if (float(abs(y)) > r) continue;
				if (x == 0 && y == 0) continue;
				vec2 off = vec2(float(x), float(y)) * px;
				if (texture(uTexture, vTextureCoord + off).a >= 0.01)
					found = 1.0;
			}
		}

		if (found > 0.5)
			finalColor = vec4(uColor, uIntensity);
		else
			finalColor = original;
	}
`;

const definition: EffectDefinition = {
	label: 'Outline',
	icon: '⬜',
	params: [
		{
			key: 'radius',
			label: 'Width',
			min: 1,
			max: 20,
			step: 1,
			default: 3
		},
		{
			key: 'colorR',
			label: 'Red',
			min: 0,
			max: 255,
			step: 1,
			default: 0
		},
		{
			key: 'colorG',
			label: 'Green',
			min: 0,
			max: 255,
			step: 1,
			default: 0
		},
		{
			key: 'colorB',
			label: 'Blue',
			min: 0,
			max: 255,
			step: 1,
			default: 0
		},
		{
			key: 'intensity',
			label: 'Intensity',
			min: 0,
			max: 255,
			step: 1,
			default: 255
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(OUTLINE_FRAGMENT, {
			uRadius: { value: settings.radius, type: 'f32' },
			uColor: {
				value: [settings.colorR / 255, settings.colorG / 255, settings.colorB / 255],
				type: 'vec3<f32>'
			},
			uIntensity: { value: settings.intensity / 255, type: 'f32' }
		}),
	isNoop: (settings: EffectSettings) => settings.radius <= 0 || settings.intensity <= 0
};

export default definition;
