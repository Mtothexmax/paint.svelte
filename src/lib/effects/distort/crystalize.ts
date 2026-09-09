import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const CELL_SIZE = 12;

// Voronoi "crystals": a jittered seed per grid cell, each pixel claims the
// colour of its nearest seed → jagged crystallised facets.
const CRYSTALIZE_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uCellSize;

	float hash(vec2 p)
	{
		return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
	}

	vec2 seed(vec2 cell)
	{
		return cell + vec2(hash(cell), hash(cell + 13.7));
	}

	void main()
	{
		vec2 px = vTextureCoord * uInputSize.xy;
		vec2 cell = floor(px / uCellSize);
		float bestD = 1e9;
		vec2 bestSeed = vec2(0.0);
		for (int x = -1; x <= 1; x++)
		{
			for (int y = -1; y <= 1; y++)
			{
				vec2 c = cell + vec2(float(x), float(y));
				vec2 s = seed(c);
				float d = length(px - s * uCellSize);
				if (d < bestD)
				{
					bestD = d;
					bestSeed = s;
				}
			}
		}
		vec2 uv = bestSeed * uCellSize * uInputSize.zw;
		finalColor = texture(uTexture, uv);
	}
`;

const definition: EffectDefinition = {
	label: 'Crystalize',
	icon: '💎',
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
			CRYSTALIZE_FRAGMENT,
			{ uCellSize: { value: settings.cellSize, type: 'f32' } },
			Math.ceil(settings.cellSize * 1.5)
		),
	isNoop: (settings: EffectSettings) => settings.cellSize <= 1
};

export default definition;