import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const AMOUNT = 50;

// Unsharp mask: amplifies the luminance difference between a pixel and its
// blurred neighbourhood via a classic 3×3 high-pass kernel.
const SHARPEN_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uAmount;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 c = texture(uTexture, vTextureCoord);

		vec4 acc = vec4(0.0);
		acc += texture(uTexture, vTextureCoord + texel * vec2(-1.0, -1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(0.0, -1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(1.0, -1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(-1.0, 0.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(1.0, 0.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(-1.0, 1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(0.0, 1.0));
		acc += texture(uTexture, vTextureCoord + texel * vec2(1.0, 1.0));

		vec4 blurred = acc / 8.0;
		finalColor = max(c + (c - blurred) * uAmount, 0.0);
	}
`;

const definition: EffectDefinition = {
	label: 'Sharpen',
	icon: '💠',
	params: [
		{
			key: 'amount',
			label: 'Amount',
			min: 0,
			max: 200,
			step: 1,
			default: AMOUNT
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			SHARPEN_FRAGMENT,
			{ uAmount: { value: settings.amount * 0.02, type: 'f32' } },
			1
		),
	isNoop: (settings: EffectSettings) => settings.amount <= 0
};

export default definition;