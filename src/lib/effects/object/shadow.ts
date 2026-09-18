import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const SHADOW_FRAGMENT = `
    precision highp float;
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uOffsetX;
    uniform float uOffsetY;
    uniform float uBlur;
    uniform vec3 uColor;
    uniform float uIntensity;

    void main()
    {
        vec4 original = texture(uTexture, vTextureCoord);
        vec2 px = uInputSize.zw;

        // Versatz für den Schatten anwenden
        vec2 samplePos = vTextureCoord - vec2(uOffsetX, uOffsetY) * px;
        
        float blurredA = 0.0;
        float count = 0.0;
        float r = min(uBlur, 20.0);
        int limitR = int(ceil(r));

        // Erwiterter Loop für sauberen Blur bis zu 20px
        for (int y = -20; y <= 20; y++)
        {
            if (abs(float(y)) > float(limitR)) continue;
            for (int x = -20; x <= 20; x++)
            {
                if (abs(float(x)) > float(limitR)) continue;

                vec2 off = vec2(float(x), float(y)) * px;
                blurredA += texture(uTexture, samplePos + off).a;
                count += 1.0;
            }
        }
        blurredA /= max(count, 1.0);

        float shadowA = blurredA * uIntensity;
        vec4 shadow = vec4(uColor * shadowA, shadowA);

        // Saubere Alpha-Komposition: Original im Vordergrund, Schatten im Hintergrund
        finalColor = original + shadow * (1.0 - original.a);
    }
`;

const definition: EffectDefinition = {
    label: 'Drop Shadow',
    icon: '⬛',
    params: [
        {
            key: 'offset',
            label: 'Offset',
            kind: 'xy',
            minX: -50,
            maxX: 50,
            minY: -50,
            maxY: 50,
            step: 1,
            default: 4,
            defaultY: 4,
            yDown: true
        },
        {
            key: 'blur',
            label: 'Blur Radius',
            min: 0,
            max: 20,
            step: 1,
            default: 4
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
            key: 'intensity',
            label: 'Opacity',
            min: 0,
            max: 255,
            step: 1,
            default: 128
        }
    ],
    filter: (settings: EffectSettings) => {
        const offsetX = settings.offsetX ?? 4;
        const offsetY = settings.offsetY ?? 4;
        const blur = settings.blur ?? 4;
        const c = Math.max(0, Math.floor(settings.color ?? 0)) & 0xffffff;

        // Dynamisches Padding verhindert das Abschneiden von Blur und Offset an den Rändern
        const totalPadding = Math.ceil(Math.max(Math.abs(offsetX), Math.abs(offsetY)) + blur);

        return makeGlFilter(
            SHADOW_FRAGMENT,
            {
                uOffsetX: { value: offsetX, type: 'f32' },
                uOffsetY: { value: offsetY, type: 'f32' },
                uBlur: { value: blur, type: 'f32' },
                uColor: {
                    value: [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255],
                    type: 'vec3<f32>'
                },
                uIntensity: { value: (settings.intensity ?? 128) / 255, type: 'f32' }
            },
            totalPadding
        );
    },
    isNoop: (settings: EffectSettings) => (settings.intensity ?? 128) <= 0
};

export default definition;