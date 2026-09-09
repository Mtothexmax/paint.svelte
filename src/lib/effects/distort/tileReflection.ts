import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const TILE_COUNT = 4;

// Replicates the frame into a grid of mirrored tiles, producing a kaleidoscopic effect.
const TILE_REFLECTION_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uTileCount;

	float core(float x, float count)
	{
		float t = x * count;
		t = fract(t);
		return 1.0 - abs(2.0 * t - 1.0);
	}

	void main()
	{
		vec2 s = vTextureCoord;
		s.x = core(s.x, uTileCount);
		s.y = core(s.y, uTileCount);
		finalColor = texture(uTexture, s);
	}
`;

const definition: EffectDefinition = {
	label: 'Tile Reflection',
	icon: '🪞',
	params: [
		{
			key: 'tileCount',
			label: 'Tiles',
			min: 1,
			max: 12,
			step: 1,
			default: TILE_COUNT
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			TILE_REFLECTION_FRAGMENT,
			{ uTileCount: { value: settings.tileCount, type: 'f32' } },
			0
		),
	isNoop: (settings: EffectSettings) => settings.tileCount <= 1
};

export default definition;