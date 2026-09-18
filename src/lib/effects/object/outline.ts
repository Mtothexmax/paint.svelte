import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const OUTLINE_FRAGMENT = `
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uWidth;
    uniform float uBlurRadius;
    uniform vec3 uColor;

    void main()
    {
        vec4 original = texture(uTexture, vTextureCoord);
        vec2 px = uInputSize.zw;
        
        float width = min(max(uWidth, 0.0), 20.0);
        float blur = min(max(uBlurRadius, 0.0), 20.0);
        float maxRadius = width + blur;

        float minDist = 1000.0;

        if (original.a > 0.05)
        {
            minDist = 0.0;
        }
        else if (maxRadius > 0.0)
        {
            int limit = int(ceil(maxRadius));

            // Erweiterter Suchbereich auf -40 bis 40, um Clipping bei maximalem Blur zu verhindern
            for (int x = -40; x <= 40; x++)
            {
                float fx = float(x);
                if (abs(fx) > float(limit)) continue;

                for (int y = -40; y <= 40; y++)
                {
                    float fy = float(y);
                    if (abs(fy) > float(limit)) continue;

                    vec2 off = vec2(fx, fy) * px;
                    vec2 sampleCoord = vTextureCoord + off;

                    if (sampleCoord.x >= 0.0 && sampleCoord.x <= 1.0 && sampleCoord.y >= 0.0 && sampleCoord.y <= 1.0)
                    {
                        float neighborAlpha = texture(uTexture, sampleCoord).a;
                        if (neighborAlpha > 0.05)
                        {
                            float dist = length(vec2(fx, fy));
                            minDist = min(minDist, dist);
                        }
                    }
                }
            }
        }

        // Hintergrund-Füllung und Blur-Halo
        vec4 background = vec4(0.0);
        if (minDist <= maxRadius)
        {
            float alpha = 1.0;
            
            if (minDist > width && blur > 0.0)
            {
                float t = (minDist - width) / blur;
                alpha = 1.0 - smoothstep(0.0, 1.0, t);
            }

            background = vec4(uColor * alpha, alpha);
        }

        // Saubere Komposition: Original im Vordergrund, Outline im Hintergrund
        finalColor = original + background * (1.0 - original.a);
    }
`;

const definition: EffectDefinition = {
    label: 'Outline',
    icon: '⬜',
    params: [
        {
            key: 'width',
            label: 'Width',
            min: 1,
            max: 20,
            step: 1,
            default: 3
        },
        {
            key: 'color',
            label: 'Color',
            min: 0,
            max: 0xffffff,
            step: 1,
            default: 0,
            kind: 'color'
        },
        {
            key: 'blurRadius',
            label: 'Blur radius',
            min: 0,
            max: 20,
            step: 1,
            default: 0
        }
    ],
    filter: (settings: EffectSettings) => {
        const width = settings.width ?? 3;
        const blur = settings.blurRadius ?? 0;
        const c = Math.max(0, Math.floor(settings.color ?? 0)) & 0xffffff;

        // Dynamisches Padding stellt sicher, dass das Canvas groß genug für den Blur ist
        const totalPadding = Math.ceil(width + blur);

        return makeGlFilter(
            OUTLINE_FRAGMENT,
            {
                uWidth: { value: width, type: 'f32' },
                uBlurRadius: { value: blur, type: 'f32' },
                uColor: {
                    value: [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255],
                    type: 'vec3<f32>'
                }
            },
            totalPadding
        );
    },
    isNoop: (settings: EffectSettings) => (settings.width ?? 0) <= 0 && (settings.blurRadius ?? 0) <= 0
};

export default definition;