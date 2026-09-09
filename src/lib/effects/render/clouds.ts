import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const SCALE = 250;
const POWER = 50;
const SEED = 0;

const CLOUDS_FRAGMENT = `
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;

    uniform float uScale;
    uniform float uPower;
    uniform float uSeed;

    // Quintic interpolation curve (Paint.NET standard)
    vec2 fade(vec2 t)
    {
        return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }

    // 8 discrete gradient directions matching Paint.NET's permutation table
    vec2 getGradient(vec2 p, float octaveSeed)
    {
        // Safe integer wrapping (mod 256) without float precision loss
        vec2 ip = mod(mod(p, 256.0) + 256.0, 256.0);
        float h = fract(sin(dot(ip, vec2(127.1, 311.7)) + octaveSeed) * 43758.5453123);
        
        // Snap to 8 exact directional angles (PI / 4 steps)
        float angle = floor(h * 8.0) * 0.78539816339;
        return vec2(cos(angle), sin(angle));
    }

    // Classic 2D Perlin noise without edge artifacts
    float perlinNoise(vec2 p, float octaveSeed)
    {
        vec2 i = floor(p);
        vec2 f = fract(p);

        vec2 g00 = getGradient(i + vec2(0.0, 0.0), octaveSeed);
        vec2 g10 = getGradient(i + vec2(1.0, 0.0), octaveSeed);
        vec2 g01 = getGradient(i + vec2(0.0, 1.0), octaveSeed);
        vec2 g11 = getGradient(i + vec2(1.0, 1.0), octaveSeed);

        float n00 = dot(g00, f - vec2(0.0, 0.0));
        float n10 = dot(g10, f - vec2(1.0, 0.0));
        float n01 = dot(g01, f - vec2(0.0, 1.0));
        float n11 = dot(g11, f - vec2(1.0, 1.0));

        vec2 u = fade(f);

        return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
    }

    void main()
    {
        // Centered coordinate space: dx = 2*X - Width, dy = 2*Y - Height
        vec2 canvasPos = vTextureCoord * uInputSize.xy;
        vec2 d = 2.0 * canvasPos - uInputSize.xy;

        float val = 0.0;
        float mult = 1.0;
        float div = max(uScale, 1.0);

        for (int i = 0; i < 12; i++)
        {
            if (mult <= 0.03 || div <= 0.0)
            {
                break;
            }

            // High-precision division without 65536.0 offset
            vec2 dr = d / div;

            // Seed per octave (matches Pinta byte-xor variation)
            float octaveSeed = uSeed + float(i) * 17.13;

            float noise = perlinNoise(dr, octaveSeed);

            val += noise * mult;
            div /= 2.0;
            mult *= uPower;
        }

        // Map noise range [-1, 1] -> [0, 1]
        float t = clamp((val + 1.0) * 0.5, 0.0, 1.0);

        // Sky Blue / White cloud gradient mapping
        vec3 colBg = vec3(1.0, 1.0, 1.0);
        vec3 colFg = vec3(0.0, 0.4, 0.8);
        vec3 finalCol = mix(colBg, colFg, t);

        gl_FragColor = vec4(finalCol, 1.0);
    }
`;

const definition: EffectDefinition = {
    label: 'Clouds',
    icon: '☁️',
    params: [
        {
            key: 'scale',
            label: 'Scale',
            min: 2,
            max: 1000,
            step: 1,
            default: SCALE
        },
        {
            key: 'power',
            label: 'Power',
            min: 0,
            max: 100,
            step: 1,
            default: POWER
        },
        {
            key: 'seed',
            label: 'Seed',
            min: 0,
            max: 255,
            step: 1,
            default: SEED
        }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            CLOUDS_FRAGMENT,
            {
                uScale: { value: settings.scale, type: 'f32' },
                uPower: { value: settings.power / 100.0, type: 'f32' },
                uSeed: { value: settings.seed, type: 'f32' }
            },
            0
        ),
    isNoop: () => false
};

export default definition;