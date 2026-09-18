import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const THRESHOLD = 30;
const THICKNESS = 2;

// Improved Ink Outline with alpha-aware edge detection, high precision, and clean premultiplied alpha output
const OUTLINE_FRAGMENT = `
    precision highp float;
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
        vec4 sCenter = texture(uTexture, uv);
        
        // Ignore fully transparent background pixels
        if (sCenter.a <= 0.001) return 0.0;

        vec4 sa = texture(uTexture, uv + vec2(-t.x, -t.y));
        vec4 sb = texture(uTexture, uv + vec2(t.x, -t.y));
        vec4 sc = texture(uTexture, uv + vec2(-t.x, t.y));
        vec4 sd = texture(uTexture, uv + vec2(t.x, t.y));

        // Luminance gradients (internal details)
        float gx = lum(sa) - lum(sd);
        float gy = lum(sc) - lum(sb);
        float grad = length(vec2(gx, gy)) * 2.0;

        // Alpha gradients (silhouette edges)
        float ax = sa.a - sd.a;
        float ay = sc.a - sb.a;
        float alphaGrad = length(vec2(ax, ay));

        return max(grad, alphaGrad);
    }

    void main()
    {
        vec2 texel = uInputSize.zw;
        vec4 src = texture(uTexture, vTextureCoord);
        
        float thick = clamp(uThickness, 1.0, 8.0);
        int limit = int(ceil(thick));

        float isEdge = 0.0;

        for (int y = -8; y <= 8; y++)
        {
            if (abs(float(y)) > thick) continue;
            for (int x = -8; x <= 8; x++)
            {
                if (abs(float(x)) > thick) continue;

                vec2 off = vec2(float(x), float(y));
                if (length(off) > thick) continue;

                if (edgeAt(vTextureCoord + off * texel) > uThreshold * 0.01)
                {
                    isEdge = 1.0;
                    break;
                }
            }
            if (isEdge > 0.5) break;
        }

        // Dark charcoal ink color
        vec3 inkRgb = vec3(0.04, 0.03, 0.03);

        if (isEdge > 0.5)
        {
            // Clean premultiplied alpha output for the outline
            float outAlpha = max(src.a, 0.9);
            finalColor = vec4(inkRgb * outAlpha, outAlpha);
        }
        else
        {
            finalColor = src;
        }
    }
`;

const definition: EffectDefinition = {
    label: 'Ink Outline',
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
                uThreshold: { value: settings.threshold ?? THRESHOLD, type: 'f32' },
                uThickness: { value: settings.thickness ?? THICKNESS, type: 'f32' }
            },
            Math.ceil(settings.thickness ?? THICKNESS)
        ),
    isNoop: (settings: EffectSettings) => (settings.threshold ?? THRESHOLD) <= 0
};

export default definition;