import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const FACTOR = 1;
const QUALITY = 2;
const ZOOM = 10;
const ANGLE = 0;

const MANDELBROT_FRAGMENT = `
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;

    uniform float uFactor;
    uniform float uQuality;
    uniform float uZoom;
    uniform float uAngle;
    uniform vec2 uOffset;
    uniform float uInvert;

    // Smooth escape-time calculation with bailout radius 100,000 (Paint.NET standard)
    float calcMandelbrot(vec2 c)
    {
        vec2 z = vec2(0.0);
        float iter = 0.0;
        
        for (int i = 0; i < 256; i++)
        {
            if (dot(z, z) > 100000.0)
            {
                break;
            }
            z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
            iter += 1.0;
        }

        if (iter >= 256.0)
        {
            return -1.0; // Inside set
        }

        // Renormalized continuous potential (eliminates color banding)
        float log_zn = log(dot(z, z)) / 2.0;
        float nu = log(log_zn / 0.69314718056) / 0.69314718056;
        return iter + 1.0 - nu;
    }

    // Paint.NET "Electric" preset color mapping
    vec3 getColor(float m, float factor)
    {
        if (m < 0.0)
        {
            return vec3(0.0); // Interior pure black
        }

        float c = clamp(64.0 + factor * m * 8.0, 0.0, 1023.0) / 1023.0;
        
        // Multi-stop electric gradient cyclic map
        vec3 col = 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 1.0, 1.0) * c + vec3(0.0, 0.33, 0.67)));
        return col;
    }

    void main()
    {
        // Paint.NET coordinate setup: (2*X - Width) / Height
        vec2 canvasPos = vTextureCoord * uInputSize.xy;
        vec2 baseUV = (2.0 * canvasPos - uInputSize.xy) / uInputSize.y;

        // Rotation matrix
        float rad = uAngle * 0.01745329251; // Degrees to radians
        mat2 rot = mat2(cos(rad), sin(rad), -sin(rad), cos(rad));

        float effectiveZoom = 1.0 + 20.0 * (uZoom / 100.0);
        vec2 offsetBasis = vec2(-0.7, -0.29) + uOffset;

        vec3 colorAcc = vec3(0.0);
        float samples = uQuality > 1.0 ? 4.0 : 1.0;

        // 2x2 Sub-pixel Anti-Aliasing grid if Quality > 1
        for (int sx = 0; sx < 2; sx++)
        {
            for (int sy = 0; sy < 2; sy++)
            {
                if (samples == 1.0 && (sx > 0 || sy > 0)) continue;

                vec2 subOffset = samples > 1.0 
                    ? (vec2(float(sx), float(sy)) - 0.5) * (1.0 / uInputSize.y) 
                    : vec2(0.0);

                vec2 rel = baseUV + subOffset;
                vec2 rotatedRel = rot * rel;
                vec2 c = (rotatedRel / effectiveZoom) + offsetBasis;

                float m = calcMandelbrot(c);
                colorAcc += getColor(m, uFactor);
            }
        }

        vec3 finalCol = colorAcc / samples;

        // Apply color inversion if enabled
        if (uInvert > 0.5)
        {
            finalCol = vec3(1.0) - finalCol;
        }

        gl_FragColor = vec4(finalCol, 1.0);
    }
`;

const definition: EffectDefinition = {
    label: 'Mandelbrot Fractal',
    icon: '🪸',
	params: [
		{
			key: 'offset',
			label: 'Offset',
			kind: 'xy',
			minX: -2,
			maxX: 2,
			minY: -2,
			maxY: 2,
			step: 0.01,
			default: 0,
			defaultY: 0
		},
		{
			key: 'zoom',
			label: 'Zoom',
			min: 0,
			max: 100,
			step: 0.5,
			default: ZOOM
		},
		{
			key: 'angle',
			label: 'Angle',
			min: 0,
			max: 360,
			step: 1,
			default: ANGLE,
			kind: 'angle'
		},
		{
			key: 'factor',
			label: 'Factor',
			min: 1,
			max: 10,
			step: 1,
			default: FACTOR
		},
		{
			key: 'quality',
			label: 'Quality',
			min: 1,
			max: 2,
			step: 1,
			default: QUALITY
		},
		{
			key: 'invertColors',
			label: 'Invert Colors',
			kind: 'checkbox',
			min: 0,
			max: 1,
			step: 1,
			default: 0
		}
	],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            MANDELBROT_FRAGMENT,
            {
                uFactor: { value: settings.factor, type: 'f32' },
                uQuality: { value: settings.quality, type: 'f32' },
                uZoom: { value: settings.zoom, type: 'f32' },
                uAngle: { value: settings.angle, type: 'f32' },
                uOffset: {
                    value: [settings.offsetX ?? 0, settings.offsetY ?? 0] as [number, number],
                    type: 'vec2<f32>'
                },
                uInvert: { value: settings.invertColors ? 1 : 0, type: 'f32' }
            },
            0
        ),
    isNoop: () => false
};

export default definition;