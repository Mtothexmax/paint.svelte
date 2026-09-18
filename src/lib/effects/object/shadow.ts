import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

// Object: Drop Shadow — offsets the shape, blurs the alpha and colours it.
// The shadow is drawn *behind* the original pixels (transparent areas get the
// shadow, opaque areas keep the original).
const SHADOW_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform highp vec4 uInputSize;
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
			if (abs(float(x)) > r) continue;
			for (int y = -10; y <= 10; y++)
			{
				if (abs(float(y)) > r) continue;
				vec2 off = vec2(float(x), float(y)) * px;
				blurredA += texture(uTexture, samplePos + off).a;
				count += 1.0;
			}
		}
		blurredA /= max(count, 1.0);

		// Premultiplied alpha (Pixi's blend convention, and what every other
		// effect here emits): rgb must be scaled by the alpha we output.
		// Emitting the raw colour made a semi-transparent bright shadow render
		// as a solid opaque slab — invisible while the colour was black
		// (rgb 0 stays 0), glaring as soon as the colour row picks anything
		// lighter. Default (black, opacity 128) is bit-for-bit unchanged.
		float shadowA = blurredA * uIntensity;
		vec4 shadow = vec4(uColor * shadowA, shadowA);

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
		// Offset as a pad: drag the point and the shadow follows. The shader
		// samples at `uv - offset`, so a POSITIVE offset moves the shadow DOWN
		// — i.e. the value is already image space, hence `yDown`.
		{
			key: 'offset',
			label: 'Offset',
			kind: 'xy',
			minX: -50,
			maxX: 50,
			minY: -50,
			maxY: 50,
			step: 1,
			default: 4,
			defaultY: 4,
			yDown: true
		},
		{
			key: 'blur',
			label: 'Blur Radius',
			min: 0,
			max: 20,
			step: 1,
			default: 4
		},
		// One colour row instead of three R/G/B sliders — same widget the two
		// Outline effects use. Stored packed as 0xRRGGBB. `?? 0` keeps old
		// persisted settings (which carried colorR/colorG/colorB) working;
		// they resolve to black, which is exactly the old default.
		{
			key: 'color',
			label: 'Color',
			min: 0,
			max: 0xffffff,
			step: 1,
			default: 0,
			kind: 'color'
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
	filter: (settings: EffectSettings) => {
		const c = Math.max(0, Math.floor(settings.color ?? 0)) & 0xffffff;
		return makeGlFilter(SHADOW_FRAGMENT, {
			uOffsetX: { value: settings.offsetX, type: 'f32' },
			uOffsetY: { value: settings.offsetY, type: 'f32' },
			uBlur: { value: settings.blur, type: 'f32' },
			uColor: {
				value: [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255],
				type: 'vec3<f32>'
			},
			uIntensity: { value: settings.intensity / 255, type: 'f32' }
		});
	},
	isNoop: (settings: EffectSettings) => settings.intensity <= 0
};

export default definition;
