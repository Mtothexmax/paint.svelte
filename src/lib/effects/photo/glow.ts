import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const RADIUS = 6;
const BRIGHTNESS = 10;
const CONTRAST = 10;

const GLOW_FRAGMENT = `
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform sampler2D uTexture;

    uniform float uRadius;
    uniform float uBrightness;
    uniform float uContrast;

    // Multi-ring Gaussian sample disk
    vec4 getBlurred(vec2 uv, vec2 texel, float radius)
    {
        vec4 accum = texture2D(uTexture, uv);
        float total = 1.0;
        float rStep = max(radius * 0.4, 0.5);

        for (int i = 0; i < 8; i++)
        {
            float angle = float(i) * 0.78539816339; // PI / 4
            vec2 dir = vec2(cos(angle), sin(angle));

            // Inner Ring
            accum += texture2D(uTexture, uv + dir * rStep * texel) * 0.6;
            total += 0.6;

            // Outer Ring
            accum += texture2D(uTexture, uv + dir * rStep * 2.0 * texel) * 0.3;
            total += 0.3;
        }

        return accum / total;
    }

    void main()
    {
        vec4 src = texture2D(uTexture, vTextureCoord);

        if (src.a <= 0.0)
        {
            gl_FragColor = vec4(0.0);
            return;
        }

        // 1. Gaussian Blur Pass
        vec4 blurred = getBlurred(vTextureCoord, uInputSize.zw, uRadius);

        // Safely un-premultiply straight color
        vec3 srcRGB = src.rgb / src.a;
        vec3 blurRGB = blurred.a > 0.0 ? blurred.rgb / blurred.a : vec3(0.0);

        // 2. Brightness & Contrast Adjustment
        float cFactor = uContrast >= 0.0 ? (1.0 + uContrast * 2.0) : (1.0 + uContrast);
        vec3 adjustedGlow = clamp((blurRGB - 0.5) * cFactor + 0.5 + uBrightness, 0.0, 1.0);

        // 3. Screen Blend Op: 1.0 - (1.0 - Src) * (1.0 - Glow)
        vec3 screenRGB = 1.0 - (1.0 - srcRGB) * (1.0 - adjustedGlow);

        // Re-premultiply by original alpha
        gl_FragColor = vec4(screenRGB * src.a, src.a);
    }
`;

const definition: EffectDefinition = {
    label: 'Glow',
    icon: '💡',
    params: [
        {
            key: 'radius',
            label: 'Radius',
            min: 1,
            max: 20,
            step: 1,
            default: RADIUS
        },
        {
            key: 'brightness',
            label: 'Brightness',
            min: -100,
            max: 100,
            step: 1,
            default: BRIGHTNESS
        },
        {
            key: 'contrast',
            label: 'Contrast',
            min: -100,
            max: 100,
            step: 1,
            default: CONTRAST
        }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            GLOW_FRAGMENT,
            {
                uRadius: { value: settings.radius, type: 'f32' },
                uBrightness: { value: settings.brightness / 100, type: 'f32' },
                uContrast: { value: settings.contrast / 100, type: 'f32' }
            },
            Math.ceil(settings.radius)
        ),
    isNoop: (settings: EffectSettings) =>
        settings.radius <= 0 || (settings.brightness === 0 && settings.contrast === 0)
};

export default definition;