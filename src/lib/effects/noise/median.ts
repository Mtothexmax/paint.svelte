import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const RADIUS = 10;
const PERCENTILE = 50;

const MEDIAN_FRAGMENT = `
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform sampler2D uTexture;

    uniform float uRadius;
    uniform float uPercentile; // Normalized [0.0, 1.0]

    // Samples a continuous region of width 'span' around 'p' to prevent point-cloning ghosting
    vec4 sampleArea(vec2 p, vec2 span)
    {
        vec2 h = span * 0.3;
        vec4 t1 = texture2D(uTexture, clamp(p + vec2(-h.x, -h.y), 0.0, 1.0));
        vec4 t2 = texture2D(uTexture, clamp(p + vec2( h.x, -h.y), 0.0, 1.0));
        vec4 t3 = texture2D(uTexture, clamp(p + vec2(-h.x,  h.y), 0.0, 1.0));
        vec4 t4 = texture2D(uTexture, clamp(p + vec2( h.x,  h.y), 0.0, 1.0));
        return (t1 + t2 + t3 + t4) * 0.25;
    }

    // Fast WebGL 1.0 rank evaluator without dynamic array indexing or macro bloat
    float getRank(float val, float v0, float v1, float v2, float v3, float v4, float v5, float v6, float v7, float v8)
    {
        float r = 0.0;
        if (v0 < val) r += 1.0;
        if (v1 < val) r += 1.0;
        if (v2 < val) r += 1.0;
        if (v3 < val) r += 1.0;
        if (v4 < val) r += 1.0;
        if (v5 < val) r += 1.0;
        if (v6 < val) r += 1.0;
        if (v7 < val) r += 1.0;
        if (v8 < val) r += 1.0;
        return r;
    }

    void main()
    {
        if (uRadius <= 0.0)
        {
            gl_FragColor = texture2D(uTexture, vTextureCoord);
            return;
        }

        vec2 texel = uInputSize.zw;
        vec2 stepSize = (uRadius * 0.75) * texel; // Continuous coverage across radius
        vec2 uv = vTextureCoord;

        // 9 gapless, overlapping region samples
        vec4 c0 = sampleArea(uv + vec2(-stepSize.x, -stepSize.y), stepSize);
        vec4 c1 = sampleArea(uv + vec2( 0.0,        -stepSize.y), stepSize);
        vec4 c2 = sampleArea(uv + vec2( stepSize.x, -stepSize.y), stepSize);
        vec4 c3 = sampleArea(uv + vec2(-stepSize.x,  0.0),        stepSize);
        vec4 c4 = sampleArea(uv + vec2( 0.0,         0.0),        stepSize);
        vec4 c5 = sampleArea(uv + vec2( stepSize.x,  0.0),        stepSize);
        vec4 c6 = sampleArea(uv + vec2(-stepSize.x,  stepSize.y), stepSize);
        vec4 c7 = sampleArea(uv + vec2( 0.0,         stepSize.y), stepSize);
        vec4 c8 = sampleArea(uv + vec2( stepSize.x,  stepSize.y), stepSize);

        float targetRank = floor(8.0 * uPercentile + 0.5);

        // --- Red Channel ---
        float bestR = c4.r, minDiffR = 999.0;
        float r0 = getRank(c0.r, c0.r, c1.r, c2.r, c3.r, c4.r, c5.r, c6.r, c7.r, c8.r); float d0 = abs(r0 - targetRank); if (d0 < minDiffR) { minDiffR = d0; bestR = c0.r; }
        float r1 = getRank(c1.r, c0.r, c1.r, c2.r, c3.r, c4.r, c5.r, c6.r, c7.r, c8.r); float d1 = abs(r1 - targetRank); if (d1 < minDiffR) { minDiffR = d1; bestR = c1.r; }
        float r2 = getRank(c2.r, c0.r, c1.r, c2.r, c3.r, c4.r, c5.r, c6.r, c7.r, c8.r); float d2 = abs(r2 - targetRank); if (d2 < minDiffR) { minDiffR = d2; bestR = c2.r; }
        float r3 = getRank(c3.r, c0.r, c1.r, c2.r, c3.r, c4.r, c5.r, c6.r, c7.r, c8.r); float d3 = abs(r3 - targetRank); if (d3 < minDiffR) { minDiffR = d3; bestR = c3.r; }
        float r4 = getRank(c4.r, c0.r, c1.r, c2.r, c3.r, c4.r, c5.r, c6.r, c7.r, c8.r); float d4 = abs(r4 - targetRank); if (d4 < minDiffR) { minDiffR = d4; bestR = c4.r; }
        float r5 = getRank(c5.r, c0.r, c1.r, c2.r, c3.r, c4.r, c5.r, c6.r, c7.r, c8.r); float d5 = abs(r5 - targetRank); if (d5 < minDiffR) { minDiffR = d5; bestR = c5.r; }
        float r6 = getRank(c6.r, c0.r, c1.r, c2.r, c3.r, c4.r, c5.r, c6.r, c7.r, c8.r); float d6 = abs(r6 - targetRank); if (d6 < minDiffR) { minDiffR = d6; bestR = c6.r; }
        float r7 = getRank(c7.r, c0.r, c1.r, c2.r, c3.r, c4.r, c5.r, c6.r, c7.r, c8.r); float d7 = abs(r7 - targetRank); if (d7 < minDiffR) { minDiffR = d7; bestR = c7.r; }
        float r8 = getRank(c8.r, c0.r, c1.r, c2.r, c3.r, c4.r, c5.r, c6.r, c7.r, c8.r); float d8 = abs(r8 - targetRank); if (d8 < minDiffR) { minDiffR = d8; bestR = c8.r; }

        // --- Green Channel ---
        float bestG = c4.g, minDiffG = 999.0;
        float g0 = getRank(c0.g, c0.g, c1.g, c2.g, c3.g, c4.g, c5.g, c6.g, c7.g, c8.g); float dg0 = abs(g0 - targetRank); if (dg0 < minDiffG) { minDiffG = dg0; bestG = c0.g; }
        float g1 = getRank(c1.g, c0.g, c1.g, c2.g, c3.g, c4.g, c5.g, c6.g, c7.g, c8.g); float dg1 = abs(g1 - targetRank); if (dg1 < minDiffG) { minDiffG = dg1; bestG = c1.g; }
        float g2 = getRank(c2.g, c0.g, c1.g, c2.g, c3.g, c4.g, c5.g, c6.g, c7.g, c8.g); float dg2 = abs(g2 - targetRank); if (dg2 < minDiffG) { minDiffG = dg2; bestG = c2.g; }
        float g3 = getRank(c3.g, c0.g, c1.g, c2.g, c3.g, c4.g, c5.g, c6.g, c7.g, c8.g); float dg3 = abs(g3 - targetRank); if (dg3 < minDiffG) { minDiffG = dg3; bestG = c3.g; }
        float g4 = getRank(c4.g, c0.g, c1.g, c2.g, c3.g, c4.g, c5.g, c6.g, c7.g, c8.g); float dg4 = abs(g4 - targetRank); if (dg4 < minDiffG) { minDiffG = dg4; bestG = c4.g; }
        float g5 = getRank(c5.g, c0.g, c1.g, c2.g, c3.g, c4.g, c5.g, c6.g, c7.g, c8.g); float dg5 = abs(g5 - targetRank); if (dg5 < minDiffG) { minDiffG = dg5; bestG = c5.g; }
        float g6 = getRank(c6.g, c0.g, c1.g, c2.g, c3.g, c4.g, c5.g, c6.g, c7.g, c8.g); float dg6 = abs(g6 - targetRank); if (dg6 < minDiffG) { minDiffG = dg6; bestG = c6.g; }
        float g7 = getRank(c7.g, c0.g, c1.g, c2.g, c3.g, c4.g, c5.g, c6.g, c7.g, c8.g); float dg7 = abs(g7 - targetRank); if (dg7 < minDiffG) { minDiffG = dg7; bestG = c7.g; }
        float g8 = getRank(c8.g, c0.g, c1.g, c2.g, c3.g, c4.g, c5.g, c6.g, c7.g, c8.g); float dg8 = abs(g8 - targetRank); if (dg8 < minDiffG) { minDiffG = dg8; bestG = c8.g; }

        // --- Blue Channel ---
        float bestB = c4.b, minDiffB = 999.0;
        float b0 = getRank(c0.b, c0.b, c1.b, c2.b, c3.b, c4.b, c5.b, c6.b, c7.b, c8.b); float db0 = abs(b0 - targetRank); if (db0 < minDiffB) { minDiffB = db0; bestB = c0.b; }
        float b1 = getRank(c1.b, c0.b, c1.b, c2.b, c3.b, c4.b, c5.b, c6.b, c7.b, c8.b); float db1 = abs(b1 - targetRank); if (db1 < minDiffB) { minDiffB = db1; bestB = c1.b; }
        float b2 = getRank(c2.b, c0.b, c1.b, c2.b, c3.b, c4.b, c5.b, c6.b, c7.b, c8.b); float db2 = abs(b2 - targetRank); if (db2 < minDiffB) { minDiffB = db2; bestB = c2.b; }
        float b3 = getRank(c3.b, c0.b, c1.b, c2.b, c3.b, c4.b, c5.b, c6.b, c7.b, c8.b); float db3 = abs(b3 - targetRank); if (db3 < minDiffB) { minDiffB = db3; bestB = c3.b; }
        float b4 = getRank(c4.b, c0.b, c1.b, c2.b, c3.b, c4.b, c5.b, c6.b, c7.b, c8.b); float db4 = abs(b4 - targetRank); if (db4 < minDiffB) { minDiffB = db4; bestB = c4.b; }
        float b5 = getRank(c5.b, c0.b, c1.b, c2.b, c3.b, c4.b, c5.b, c6.b, c7.b, c8.b); float db5 = abs(b5 - targetRank); if (db5 < minDiffB) { minDiffB = db5; bestB = c5.b; }
        float b6 = getRank(c6.b, c0.b, c1.b, c2.b, c3.b, c4.b, c5.b, c6.b, c7.b, c8.b); float db6 = abs(b6 - targetRank); if (db6 < minDiffB) { minDiffB = db6; bestB = c6.b; }
        float b7 = getRank(c7.b, c0.b, c1.b, c2.b, c3.b, c4.b, c5.b, c6.b, c7.b, c8.b); float db7 = abs(b7 - targetRank); if (db7 < minDiffB) { minDiffB = db7; bestB = c7.b; }
        float b8 = getRank(c8.b, c0.b, c1.b, c2.b, c3.b, c4.b, c5.b, c6.b, c7.b, c8.b); float db8 = abs(b8 - targetRank); if (db8 < minDiffB) { minDiffB = db8; bestB = c8.b; }

        // --- Alpha Channel ---
        float bestA = c4.a, minDiffA = 999.0;
        float a0 = getRank(c0.a, c0.a, c1.a, c2.a, c3.a, c4.a, c5.a, c6.a, c7.a, c8.a); float da0 = abs(a0 - targetRank); if (da0 < minDiffA) { minDiffA = da0; bestA = c0.a; }
        float a1 = getRank(c1.a, c0.a, c1.a, c2.a, c3.a, c4.a, c5.a, c6.a, c7.a, c8.a); float da1 = abs(a1 - targetRank); if (da1 < minDiffA) { minDiffA = da1; bestA = c1.a; }
        float a2 = getRank(c2.a, c0.a, c1.a, c2.a, c3.a, c4.a, c5.a, c6.a, c7.a, c8.a); float da2 = abs(a2 - targetRank); if (da2 < minDiffA) { minDiffA = da2; bestA = c2.a; }
        float a3 = getRank(c3.a, c0.a, c1.a, c2.a, c3.a, c4.a, c5.a, c6.a, c7.a, c8.a); float da3 = abs(a3 - targetRank); if (da3 < minDiffA) { minDiffA = da3; bestA = c3.a; }
        float a4 = getRank(c4.a, c0.a, c1.a, c2.a, c3.a, c4.a, c5.a, c6.a, c7.a, c8.a); float da4 = abs(a4 - targetRank); if (da4 < minDiffA) { minDiffA = da4; bestA = c4.a; }
        float a5 = getRank(c5.a, c0.a, c1.a, c2.a, c3.a, c4.a, c5.a, c6.a, c7.a, c8.a); float da5 = abs(a5 - targetRank); if (da5 < minDiffA) { minDiffA = da5; bestA = c5.a; }
        float a6 = getRank(c6.a, c0.a, c1.a, c2.a, c3.a, c4.a, c5.a, c6.a, c7.a, c8.a); float da6 = abs(a6 - targetRank); if (da6 < minDiffA) { minDiffA = da6; bestA = c6.a; }
        float a7 = getRank(c7.a, c0.a, c1.a, c2.a, c3.a, c4.a, c5.a, c6.a, c7.a, c8.a); float da7 = abs(a7 - targetRank); if (da7 < minDiffA) { minDiffA = da7; bestA = c7.a; }
        float a8 = getRank(c8.a, c0.a, c1.a, c2.a, c3.a, c4.a, c5.a, c6.a, c7.a, c8.a); float da8 = abs(a8 - targetRank); if (da8 < minDiffA) { minDiffA = da8; bestA = c8.a; }

        gl_FragColor = vec4(bestR, bestG, bestB, bestA);
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
            max: 50,
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
        }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            MEDIAN_FRAGMENT,
            {
                uRadius: { value: settings.radius, type: 'f32' },
                uPercentile: { value: settings.percentile / 100, type: 'f32' }
            },
            Math.ceil(settings.radius)
        ),
    isNoop: (settings: EffectSettings) => settings.radius <= 0
};

export default definition;