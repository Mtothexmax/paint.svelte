import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const CELL_SIZE = 10;

// Shatters the image into a grid of crystals; each output pixel re-samples a
// hash-jittered position inside its own cell, giving the frosted look.
const FROST_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uCellSize;

	float hash(vec2 p)
	{
		return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
	}

	void main()
	{
		vec2 px = vTextureCoord * uInputSize.xy;
		vec2 cell = floor(px / uCellSize);
		vec2 jitter = vec2(hash(cell + 1.0), hash(cell + 2.0)) * uCellSize;
		vec2 destPx = cell * uCellSize + jitter;
		vec2 destUv = destPx * uInputSize.zw;
		finalColor = texture(uTexture, destUv);
	}
`;

const definition: EffectDefinition = {
	label: 'Frosted Glass',
	icon: '🧊',
	params: [
		{
			key: 'cellSize',
			label: 'Cell size',
			min: 2,
			max: 60,
			step: 1,
			default: CELL_SIZE
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			FROST_FRAGMENT,
			{ uCellSize: { value: settings.cellSize, type: 'f32' } },
			Math.ceil(settings.cellSize)
		),
	isNoop: (settings: EffectSettings) => settings.cellSize <= 1
};

export default definition;