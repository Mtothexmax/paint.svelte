import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

// --- PASS 1: SHRINK (Erosion - Kreiserhaltend) ---
const SHRINK_FRAGMENT = `
    precision highp float;
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uShrink;

    void main()
    {
        vec4 original = texture(uTexture, vTextureCoord);
        float shrink = clamp(uShrink, 0.0, 25.0);

        if (shrink <= 0.001)
        {
            finalColor = original;
            return;
        }

        vec2 px = uInputSize.zw;
        float erodedAlpha = original.a;

        // Direkter, stabiler Loop bis 25 (garantiert keine Aussetzer)
        for (int y = -25; y <= 25; y++)
        {
            float fy = float(y);
            if (abs(fy) > shrink) continue;

            for (int x = -25; x <= 25; x++)
            {
                float fx = float(x);
                if (abs(fx) > shrink) continue;

                // length() sorgt dafür, dass Kreise rund bleiben statt zu Rauten zu werden
                if (length(vec2(fx, fy)) <= shrink)
                {
                    vec2 offset = vec2(fx, fy) * px;
                    float neighborAlpha = texture(uTexture, vTextureCoord + offset).a;
                    erodedAlpha = min(erodedAlpha, neighborAlpha);
                }
            }
        }

        if (erodedAlpha <= 0.0001)
        {
            finalColor = vec4(0.0);
            return;
        }

        // Farb-Invarianz wahren (keine weißen Ränder bei bunten Objekten)
        float ratio = original.a > 0.0001 ? erodedAlpha / original.a : 0.0;
        finalColor = vec4(original.rgb * ratio, erodedAlpha);
    }
`;

// --- PASS 2: BLUR ---
const BLUR_FRAGMENT = `
    precision highp float;
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uBlur;

    void main()
    {
        vec4 original = texture(uTexture, vTextureCoord);
        float radius = clamp(uBlur, 0.0, 25.0);

        if (radius <= 0.001)
        {
            finalColor = original;
            return;
        }

        vec2 px = uInputSize.zw;
        float sigma = max(radius * 0.5, 0.0001);

        float sum = 0.0;
        float weightSum = 0.0;
        vec3 colorSum = vec3(0.0);

        for (int y = -25; y <= 25; y++)
        {
            float fy = float(y);
            if (abs(fy) > radius) continue;

            for (int x = -25; x <= 25; x++)
            {
                float fx = float(x);
                if (abs(fx) > radius) continue;

                float d = length(vec2(fx, fy));
                if (d > radius) continue;

                vec2 offset = vec2(fx, fy) * px;
                vec4 sampleCol = texture(uTexture, vTextureCoord + offset);

                float w = exp(-(d * d) / (2.0 * sigma * sigma));
                sum += sampleCol.a * w;
                colorSum += sampleCol.rgb * w;
                weightSum += w;
            }
        }

        if (weightSum <= 0.0001)
        {
            finalColor = original;
            return;
        }

        float blurredAlpha = sum / weightSum;
        vec3 blurredRgb = colorSum / weightSum;

        // Silhouette nicht über das Original vergrößern
        float finalAlpha = min(blurredAlpha, original.a);

        finalColor = vec4(blurredRgb, finalAlpha);
    }
`;

const definition: EffectDefinition = {
    label: 'Feather',
    icon: '🪶',
    params: [
        {
            key: 'shrink',
            label: 'Shrink',
            min: 0,
            max: 25,
            step: 1,
            default: 0
        },
        {
            key: 'blur',
            label: 'Blur',
            min: 0,
            max: 25,
            step: 1,
            default: 3
        }
    ],
    filter: (settings: EffectSettings) => {
        const shrink = settings.shrink ?? 0;
        const blur = settings.blur ?? 0;

        const shrinkFilter = makeGlFilter(
            SHRINK_FRAGMENT,
            { uShrink: { value: shrink, type: 'f32' } },
            Math.ceil(shrink)
        );

        const blurFilter = makeGlFilter(
            BLUR_FRAGMENT,
            { uBlur: { value: blur, type: 'f32' } },
            Math.ceil(blur)
        );

        return [shrinkFilter, blurFilter];
    },
    isNoop: (settings: EffectSettings) =>
        (settings.shrink ?? 0) <= 0 && (settings.blur ?? 0) <= 0
};

export default definition;