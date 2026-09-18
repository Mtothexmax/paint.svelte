import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const DEFAULT_AMOUNT = 3;

// Organic per-pixel random displacement frosted glass matching Rick Brewster's Paint.NET behavior
const FROST_FRAGMENT = `
    in vec2 vTextureCoord;
    uniform highp vec4 uInputSize;
    uniform sampler2D uTexture;
    out vec4 finalColor;

    uniform float uAmount;

    float hash(vec2 p)
    {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main()
    {
        vec2 px = vTextureCoord * uInputSize.xy;
        
        // Generate independent random offsets for this specific pixel within [-uAmount, uAmount]
        vec2 seed1 = px + vec2(12.9898, 78.233);
        vec2 seed2 = px + vec2(39.346, 11.135);
        float r1 = hash(seed1);
        float r2 = hash(seed2);
        
        vec2 offset = (vec2(r1, r2) * 2.0 - 1.0) * uAmount;
        vec2 destPx = px + offset;
        vec2 destUv = destPx * uInputSize.zw;
        
        finalColor = texture(uTexture, destUv);
    }
`;

const definition: EffectDefinition = {
    label: 'Frosted Glass',
    icon: '🧊',
    params: [
        {
            key: 'amount',
            label: 'Amount',
            min: 1,
            max: 100,
            step: 1,
            default: DEFAULT_AMOUNT
        }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            FROST_FRAGMENT,
            { uAmount: { value: settings.amount, type: 'f32' } },
            Math.ceil(settings.amount)
        ),
    isNoop: (settings: EffectSettings) => settings.amount <= 0
};

export default definition;