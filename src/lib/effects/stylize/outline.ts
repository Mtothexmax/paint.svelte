import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const THRESHOLD = 30;
const THICKNESS = 2;

// Ink trace: pixels whose luminance gradient exceeds `threshold` draw a dark
// outline; the line is then dilated over a `thickness`-radius neighbourhood.
const OUTLINE_FRAGMENT = `
	in vec2 vTextureCoord;
	uniform highp vec4 uInputSize;
	uniform sampler2D uTexture;
	out vec4 finalColor;

	uniform float uThreshold;
	uniform float uThickness;

	float lum(vec4 c)
	{
		return dot(c.rgb, vec3(0.299, 0.587, 0.114));
	}

	float edgeAt(vec2 uv)
	{
		vec2 t = uInputSize.zw;
		float a = lum(texture(uTexture, uv + vec2(-t.x, -t.y)));
		float b = lum(texture(uTexture, uv + vec2(t.x, -t.y)));
		float c = lum(texture(uTexture, uv + vec2(-t.x, t.y)));
		float d = lum(texture(uTexture, uv + vec2(t.x, t.y)));
		float gx = a - d;
		float gy = c - b;
		return length(vec2(gx, gy)) * 2.0;
	}

	void main()
	{
		vec2 texel = uInputSize.zw;
		vec4 src = texture(uTexture, vTextureCoord);
		float isEdge = 0.0;
		for (int y = -8; y <= 8; y++)
		{
			for (int x = -8; x <= 8; x++)
			{
				vec2 off = vec2(float(x), float(y));
				if (length(off) > uThickness) continue;
				if (edgeAt(vTextureCoord + off * texel) > uThreshold * 0.01)
				{
					isEdge = 1.0;
				}
			}
		}
		vec3 ink = mix(src.rgb, vec3(0.04, 0.03, 0.03), 1.0);
		finalColor = vec4(mix(src.rgb, ink, isEdge), src.a);
	}
`;

const definition: EffectDefinition = {
	label: 'Outline',
	icon: '✒️',
	params: [
		{
			key: 'threshold',
			label: 'Threshold',
			min: 0,
			max: 100,
			step: 1,
			default: THRESHOLD
		},
		{
			key: 'thickness',
			label: 'Thickness',
			min: 1,
			max: 8,
			step: 1,
			default: THICKNESS
		}
	],
	filter: (settings: EffectSettings) =>
		makeGlFilter(
			OUTLINE_FRAGMENT,
			{
				uThreshold: { value: settings.threshold, type: 'f32' },
				uThickness: { value: settings.thickness, type: 'f32' }
			},
			Math.ceil(settings.thickness)
		),
	isNoop: (settings: EffectSettings) => settings.threshold <= 0
};

export default definition;