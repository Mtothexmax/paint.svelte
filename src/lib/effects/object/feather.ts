import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

// Object: Feather — blurs the alpha channel (not the RGB) so the transition
// between fully transparent and partially opaque becomes smoother. This removes
// hard edges / white outlines from rough selections.
const FEATHER_FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform vec4 uInputSize;
	uniform float uRadius;

	void main()
	{
		vec4 c = texture(uTexture, vTextureCoord);
		vec2 px = uInputSize.zw;
		float a = 0.0;
		float count = 0.0;
		float r = min(uRadius, 10.0);

		for (int x = -10; x <= 10; x++)
		{
			if (float(abs(x)) > r) continue;
			for (int y = -10; y <= 10; y++)
			{
				if (float(abs(y)) > r) continue;
				vec2 off = vec2(float(x), float(y)) * px;
				a += texture(uTexture, vTextureCoord + off).a;
				count += 1.0;
			}
		}

		c.a = a / max(count, 1.0);
		finalColor = c;
	}
`;

const definition: EffectDefinition = {
	label: 'Feather',
	icon: '🪶',
	params: [
		{
			key: 'radius',
			label: 'Radius',
			min: 1,
			max: 20,
			step: 1,
			default: 3
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(FEATHER_FRAGMENT, {
			uRadius: { value: settings.radius, type: 'f32' }
		}),
	isNoop: (settings: EffectSettings) => settings.radius <= 0
};

export default definition;
