import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const RADIUS = 10;
const PERCENTILE = 50;
const QUALITY = 3;

const MAX_GRID = 6;
const MAX_SAMPLES = 120;

const HILO_MEDIAN_FRAGMENT = `#version 300 es
precision highp float;

in vec2 vTextureCoord;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec4 uInputSize;
uniform float uRadius;
uniform float uPercentile;

void main()
{
    vec2 texel = uInputSize.zw;

    // Exact half-pixel offsets anchoring bounds to outer pixel centers
    vec2 minUV = 0.5 * texel;
    vec2 maxUV = vec2(1.0) - 0.5 * texel;

    vec2 uv = clamp(vTextureCoord, minUV, maxUV);

    if (uRadius <= 0.0)
    {
        fragColor = texture(uTexture, uv);
        return;
    }

    int r = int(clamp(floor(uRadius + 0.5), 1.0, float(${MAX_GRID})));
    int rSq = r * r;

    vec4 samples[${MAX_SAMPLES}];
    int totalSamples = 0;

    // Isotropic circular sampling window
    for (int dy = -${MAX_GRID}; dy <= ${MAX_GRID}; dy++)
    {
        if (dy < -r || dy > r) continue;

        for (int dx = -${MAX_GRID}; dx <= ${MAX_GRID}; dx++)
        {
            if (dx < -r || dx > r) continue;

            if ((dx * dx + dy * dy) > rSq) continue;

            // Clamping out-of-bounds coordinates duplicates the outermost image edge pixels
            vec2 sampleUV = clamp(uv + vec2(float(dx), float(dy)) * texel, minUV, maxUV);
            samples[totalSamples] = texture(uTexture, sampleUV);
            totalSamples++;
        }
    }

    if (totalSamples == 0)
    {
        fragColor = texture(uTexture, uv);
        return;
    }

    // Hi-Lo (Binary Search) median over cached samples
    float targetIndex = floor(clamp(uPercentile, 0.0, 1.0) * float(totalSamples - 1));
    float targetThreshold = targetIndex + 0.5;

    vec4 lo = vec4(0.0);
    vec4 hi = vec4(1.0);

    for (int stepIdx = 0; stepIdx < 8; stepIdx++)
    {
        vec4 mid = (lo + hi) * 0.5;
        vec4 count = vec4(0.0);

        for (int i = 0; i < ${MAX_SAMPLES}; i++)
        {
            if (i >= totalSamples) break;
            count += step(samples[i], mid);
        }

        vec4 ge = step(vec4(targetThreshold), count);
        hi = mix(hi, mid, ge);
        lo = mix(mid, lo, ge);
    }

    fragColor = (lo + hi) * 0.5;
}
`;

const definition: EffectDefinition = {
    label: 'Median',
    icon: '🧂',

    params: [
        {
            key: 'radius',
            label: 'Radius',
            min: 1,
            max: 100,
            step: 1,
            default: RADIUS
        },
        {
            key: 'percentile',
            label: 'Percentile',
            min: 0,
            max: 100,
            step: 1,
            default: PERCENTILE
        },
        {
            key: 'quality',
            label: 'Quality',
            min: 1,
            max: 5,
            step: 1,
            default: QUALITY
        }
    ],

    filter: (settings: EffectSettings) => {
        const radius = Math.max(0, Math.round(settings.radius));
        const percentile = (settings.percentile ?? PERCENTILE) / 100;
        const quality = Math.max(1, Math.min(5, settings.quality ?? QUALITY));

        if (radius <= 0) return [];

        const maxPassRadius = Math.min(MAX_GRID, 1 + quality);

        // Single pass path (padding = 0 retains edge pixels)
        if (radius <= maxPassRadius) {
            return makeGlFilter(
                HILO_MEDIAN_FRAGMENT,
                {
                    uRadius: { value: radius, type: 'f32' },
                    uPercentile: { value: percentile, type: 'f32' }
                },
                0
            );
        }

        // Multi-pass execution path (padding = 0 prevents border transparency leakage across passes)
        const passesCount = Math.max(quality, Math.ceil(radius / maxPassRadius));
        const passRadius = Math.min(maxPassRadius, Math.max(1, Math.round(radius / passesCount)));
        const resolution = radius > 20 ? 0.5 : 1.0;

        const passes = [];
        for (let i = 0; i < passesCount; i++) {
            const pass = makeGlFilter(
                HILO_MEDIAN_FRAGMENT,
                {
                    uRadius: { value: passRadius, type: 'f32' },
                    uPercentile: { value: percentile, type: 'f32' }
                },
                0
            );

            if (resolution < 1.0) {
                pass.resolution = resolution;
            }

            passes.push(pass);
        }

        return passes;
    },

    isNoop: (settings: EffectSettings) => settings.radius <= 0
};

export default definition;