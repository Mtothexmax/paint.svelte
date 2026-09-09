import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const CELL_SIZE = 10;

// Block mosaic: every cell shows the average colour of its 4×4 sample grid.
const PIXELATE_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uCellSize;

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec2 px = vTextureCoord * uInputSize.xy;
		vec2 cellOrigin = floor(px / uCellSize) * uCellSize;

		const int N = 4;
		vec4 acc = vec4(0.0);
		for (int i = 0; i < N; i++)
		{
			for (int j = 0; j < N; j++)
			{
				vec2 off = vec2(float(i), float(j)) * (uCellSize / float(N - 1));
				acc += texture(uTexture, (cellOrigin + off) * texel);
			}
		}
		finalColor = acc / float(N * N);
	}
`;

const definition: EffectDefinition = {
	label: 'Pixelate',
	icon: '🔲',
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
			PIXELATE_FRAGMENT,
			{ uCellSize: { value: settings.cellSize, type: 'f32' } },
			Math.ceil(settings.cellSize)
		),
	isNoop: (settings: EffectSettings) => settings.cellSize <= 1
};

export default definition;