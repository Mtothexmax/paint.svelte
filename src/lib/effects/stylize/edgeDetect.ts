import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

// 1. Separater, mathematisch korrekter Gauß-Weichzeichner (Pass 1)
const GAUSSIAN_BLUR_FRAGMENT = `#version 300 es
    precision highp float;

    in vec2 vTextureCoord;
    uniform sampler2D uTexture;
    uniform vec4 uInputSize;
    uniform float uBlurRadius;

    out vec4 finalColor;

    void main() {
        vec2 texel = uInputSize.zw;
        vec2 minUV = 0.5 * texel;
        vec2 maxUV = vec2(1.0) - 0.5 * texel;
        vec2 uv = clamp(vTextureCoord, minUV, maxUV);

        float r = max(0.0, uBlurRadius);
        if (r <= 0.0) {
            finalColor = texture(uTexture, uv);
            return;
        }

        vec4 acc = vec4(0.0);
        float totalWeight = 0.0;
        int ir = int(ceil(r));

        // Gaußscher Abtastkern für weiche, korrekte Übergänge
        for (int dy = -12; dy <= 12; dy++) {
            if (abs(dy) > ir) continue;
            for (int dx = -12; dx <= 12; dx++) {
                if (abs(dx) > ir) continue;

                float dist = sqrt(float(dx * dx + dy * dy));
                if (dist > r) continue;

                // Gauß-Formel für natürliche Weichzeichnung
                float sigma = max(0.5, r * 0.5);
                float weight = exp(-(dist * dist) / (2.0 * sigma * sigma));

                vec2 sampleUV = clamp(uv + vec2(float(dx), float(dy)) * texel, minUV, maxUV);
                acc += texture(uTexture, sampleUV) * weight;
                totalWeight += weight;
            }
        }

        finalColor = totalWeight > 0.0 ? acc / totalWeight : texture(uTexture, uv);
    }
`;

// 2. Kantenfilter-Pass (Pass 2)
const EDGE_DETECT_FRAGMENT = `#version 300 es
    precision highp float;
    in vec2 vTextureCoord;
    uniform sampler2D uTexture;
    uniform vec4 uInputSize;
    
    uniform float uMode;     // 0 = Cosine (Paint.NET), 1 = Sobel
    uniform float uAngle;    // Nur für Cosine Mode
    uniform float uBlackBg;  // 1.0 = Schwarzer Hintergrund
    uniform float uBwOnly;   // 1.0 = Nur Schwarz-Weiß
    uniform float uRadius;   // Kanten-Radius

    out vec4 finalColor;

    float lum(vec3 c)
    {
        return dot(c, vec3(0.299, 0.587, 0.114));
    }

    void main()
    {
        vec2 texel = uInputSize.zw;

        vec2 minUV = 0.5 * texel;
        vec2 maxUV = vec2(1.0) - 0.5 * texel;
        vec2 uv = clamp(vTextureCoord, minUV, maxUV);

        vec4 src = texture(uTexture, uv);
        if (src.a <= 0.0001)
        {
            finalColor = vec4(0.0);
            return;
        }

        float r = max(1.0, floor(uRadius + 0.5));

        vec2 uv00 = clamp(uv + vec2(-r, -r) * texel, minUV, maxUV);
        vec2 uv01 = clamp(uv + vec2( 0.0, -r) * texel, minUV, maxUV);
        vec2 uv02 = clamp(uv + vec2( r, -r) * texel, minUV, maxUV);

        vec2 uv10 = clamp(uv + vec2(-r,  0.0) * texel, minUV, maxUV);
        vec2 uv12 = clamp(uv + vec2( r,  0.0) * texel, minUV, maxUV);

        vec2 uv20 = clamp(uv + vec2(-r,  r) * texel, minUV, maxUV);
        vec2 uv21 = clamp(uv + vec2( 0.0,  r) * texel, minUV, maxUV);
        vec2 uv22 = clamp(uv + vec2( r,  r) * texel, minUV, maxUV);

        vec3 c00 = texture(uTexture, uv00).rgb;
        vec3 c01 = texture(uTexture, uv01).rgb;
        vec3 c02 = texture(uTexture, uv02).rgb;
        vec3 c10 = texture(uTexture, uv10).rgb;
        vec3 c12 = texture(uTexture, uv12).rgb;
        vec3 c20 = texture(uTexture, uv20).rgb;
        vec3 c21 = texture(uTexture, uv21).rgb;
        vec3 c22 = texture(uTexture, uv22).rgb;

        vec3 result = vec3(0.5);

        if (uMode < 0.5)
        {
            float angleRad = uAngle * 0.017453292519943295;
            const float DELTA = 0.7853981633974483;

            float w00 = cos(angleRad + DELTA);
            float w01 = cos(angleRad + 2.0 * DELTA);
            float w02 = cos(angleRad + 3.0 * DELTA);
            float w10 = cos(angleRad);
            float w12 = cos(angleRad + 4.0 * DELTA);
            float w20 = cos(angleRad - DELTA);
            float w21 = cos(angleRad - 2.0 * DELTA);
            float w22 = cos(angleRad - 3.0 * DELTA);

            vec3 acc = vec3(0.0);
            acc += c00 * w00 + c01 * w01 + c02 * w02;
            acc += c10 * w10             + c12 * w12;
            acc += c20 * w20 + c21 * w21 + c22 * w22;

            if (uBlackBg > 0.5)
            {
                result = abs(acc);
            }
            else
            {
                result = vec3(0.5) + acc;
            }
        }
        else
        {
            vec3 gx = -c00 - 2.0 * c10 - c20 + c02 + 2.0 * c12 + c22;
            vec3 gy = -c00 - 2.0 * c01 - c02 + c20 + 2.0 * c21 + c22;
            vec3 mag = sqrt(gx * gx + gy * gy);

            if (uBlackBg > 0.5)
            {
                result = mag;
            }
            else
            {
                result = vec3(0.5) + mag * 0.5;
            }
        }

        result = clamp(result, 0.0, 1.0);

        if (uBwOnly > 0.5)
        {
            if (uBlackBg > 0.5)
            {
                float l = lum(result);
                result = vec3(l);
            }
            else
            {
                float mono = lum(result - vec3(0.5)) + 0.5;
                result = vec3(mono);
            }
        }

        finalColor = vec4(result * src.a, src.a);
    }
`;

const definition: EffectDefinition = {
    label: 'Edge Detect',
    icon: '🔲',
    params: [
        {
            key: 'mode',
            label: 'Algorithm',
            kind: 'select',
            options: [
                { label: 'Cosine (Paint.NET)', value: 0 },
                { label: 'Sobel', value: 1 }
            ],
            default: 0
        },
        // Rotation dial (0 = up, clockwise). The dial value IS the kernel
        // angle in degrees, so it feeds the shader unchanged (default 45
        // keeps the classic Paint.NET look). Only used by Cosine mode.
        {
            key: 'angle',
            label: 'Angle',
            kind: 'angle',
            min: 0,
            max: 360,
            step: 1,
            default: 45
        },
        {
            key: 'radius',
            label: 'Edge Radius',
            min: 1,
            max: 10,
            step: 1,
            default: 1
        },
        {
            key: 'blur',
            label: 'Pre-Blur',
            min: 0,
            max: 10,
            step: 1,
            default: 0
        },
        {
            key: 'blackBg',
            label: 'Black Background',
            kind: 'checkbox',
            default: 0
        },
        {
            key: 'bwOnly',
            label: 'Black & White Only',
            kind: 'checkbox',
            default: 0
        }
    ],
    filter: (settings: EffectSettings) => {
        const radius = settings.radius ?? 1;
        const blur = settings.blur ?? 0;
        const filters = [];

        // Pipeline-Schritt 1: Reiner, separater Gauß-Weichzeichner (falls aktiv)
        if (blur > 0) {
            filters.push(makeGlFilter(
                GAUSSIAN_BLUR_FRAGMENT,
                {
                    uBlurRadius: { value: blur, type: 'f32' }
                },
                0
            ));
        }

        // Pipeline-Schritt 2: Der Kanten-Filter (arbeitet auf dem weichgezeichneten Puffer)
        filters.push(makeGlFilter(
            EDGE_DETECT_FRAGMENT,
            {
                uMode: { value: settings.mode ?? 0, type: 'f32' },
                uAngle: { value: settings.angle ?? 45, type: 'f32' },
                uBlackBg: { value: settings.blackBg ? 1.0 : 0.0, type: 'f32' },
                uBwOnly: { value: settings.bwOnly ? 1.0 : 0.0, type: 'f32' },
                uRadius: { value: radius, type: 'f32' }
            },
            0
        ));

        return filters;
    },
    isNoop: (settings: EffectSettings) => (settings.radius ?? 1) <= 0 && (settings.blur ?? 0) <= 0
};

export default definition;