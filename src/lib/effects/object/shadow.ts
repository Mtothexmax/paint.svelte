import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

// Object: Drop Shadow — offsets the shape, blurs the alpha and colours it.
// The shadow is drawn *behind* the original pixels (transparent areas get the
// shadow, opaque areas keep the original).
const SHADOW_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform vec4 uInputSize;
	uniform float uOffsetX;
	uniform float uOffsetY;
	uniform float uBlur;
	uniform vec3 uColor;
	uniform float uIntensity;

	void main()
	{
		vec4 original = texture(uTexture, vTextureCoord);

		// Sample the offset + blurred alpha.
		vec2 px = uInputSize.zw;
		vec2 samplePos = vTextureCoord - vec2(uOffsetX, uOffsetY) * px;
		float blurredA = 0.0;
		float count = 0.0;
		float r = min(uBlur, 10.0);

		for (int x = -10; x <= 10; x++)
		{
			if (float(abs(x)) > r) continue;
			for (int y = -10; y <= 10; y++)
			{
				if (float(abs(y)) > r) continue;
				vec2 off = vec2(float(x), float(y)) * px;
				blurredA += texture(uTexture, samplePos + off).a;
				count += 1.0;
			}
		}
		blurredA /= max(count, 1.0);

		vec4 shadow = vec4(uColor, blurredA * uIntensity);

		if (original.a > 0.01)
			finalColor = original;
		else
			finalColor = shadow;
	}
`;

const definition: EffectDefinition = {
	label: 'Drop Shadow',
	icon: '⬛',
	params: [
		{
			key: 'offsetX',
			label: 'Offset X',
			min: -50,
			max: 50,
			step: 1,
			default: 4
		},
		{
			key: 'offsetY',
			label: 'Offset Y',
			min: -50,
			max: 50,
			step: 1,
			default: 4
		},
		{
			key: 'blur',
			label: 'Blur Radius',
			min: 0,
			max: 20,
			step: 1,
			default: 4
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
			label: 'Opacity',
			min: 0,
			max: 255,
			step: 1,
			default: 128
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(SHADOW_FRAGMENT, {
			uOffsetX: { value: settings.offsetX, type: 'f32' },
			uOffsetY: { value: settings.offsetY, type: 'f32' },
			uBlur: { value: settings.blur, type: 'f32' },
			uColor: {
				value: [settings.colorR / 255, settings.colorG / 255, settings.colorB / 255],
				type: 'vec3<f32>'
			},
			uIntensity: { value: settings.intensity / 255, type: 'f32' }
		}),
	isNoop: (settings: EffectSettings) => settings.intensity <= 0
};

export default definition;
