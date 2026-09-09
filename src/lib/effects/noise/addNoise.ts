import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const AMOUNT = 25;

const ADD_NOISE_FRAGMENT = `
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform sampler2D uTexture;

    uniform float uAmount;
    uniform float uMonochrome;
    uniform float uSeed;
    uniform float uLinkAlpha;

    // Dave Hoskins "Hash without Sine" (GLSL ES 100 compatible)
    vec3 hash33(vec2 p)
    {
        vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
        p3 += dot(p3, p3.yxz + 33.33);
        return fract((p3.xxy + p3.yzz) * p3.zyx);
    }

    void main()
    {
        vec4 c = texture2D(uTexture, vTextureCoord);
        vec2 px = floor(vTextureCoord * uInputSize.xy);

        // Sample independent noise per pixel in range [-0.5, 0.5]
        vec3 rnd = hash33(px + vec2(uSeed, uSeed * 1.37)) - 0.5;
        vec3 noise = mix(rnd, vec3(rnd.x), uMonochrome);

        if (uLinkAlpha > 0.5)
        {
            // --- LINKED TO ALPHA ---
            // Only apply noise to pixels that already have non-zero alpha
            if (c.a <= 0.0)
            {
                gl_FragColor = vec4(0.0);
                return;
            }

            vec3 straight = c.rgb / c.a;
            float gray = dot(straight, vec3(0.299, 0.587, 0.114));
            vec3 baseColor = mix(straight, vec3(gray), uMonochrome);

            vec3 noisyColor = clamp(baseColor + noise * uAmount, 0.0, 1.0);
            gl_FragColor = vec4(noisyColor * c.a, c.a);
        }
        else
        {
            // --- UNLINKED ---
            // Apply noise everywhere, including transparent areas
            if (c.a <= 0.0)
            {
                // On transparent pixels, generate standalone noise grain scaled by uAmount
                vec3 grainColor = clamp(vec3(0.5) + noise, 0.0, 1.0);
                float grainAlpha = uAmount;
                gl_FragColor = vec4(grainColor * grainAlpha, grainAlpha);
            }
            else
            {
                // On existing artwork pixels, apply noise normally
                vec3 straight = c.rgb / c.a;
                float gray = dot(straight, vec3(0.299, 0.587, 0.114));
                vec3 baseColor = mix(straight, vec3(gray), uMonochrome);

                vec3 noisyColor = clamp(baseColor + noise * uAmount, 0.0, 1.0);
                float outAlpha = max(c.a, uAmount);
                gl_FragColor = vec4(noisyColor * outAlpha, outAlpha);
            }
        }
    }
`;

const definition: EffectDefinition = {
    label: 'Add Noise',
    icon: '🌫',
    params: [
        {
            key: 'amount',
            label: 'Amount',
            min: 0,
            max: 100,
            step: 1,
            default: AMOUNT
        },
        {
            key: 'monochrome',
            label: 'Monochrome',
            min: 0,
            max: 100,
            step: 1,
            default: 0
        },
        {
            key: 'seed',
            label: 'Seed',
            min: 0,
            max: 1000,
            step: 1,
            default: 123
        },
        {
            key: 'linkAlpha',
            label: 'Link to alpha',
            min: 0,
            max: 1,
            step: 1,
            default: 1,
            kind: 'checkbox'
        }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            ADD_NOISE_FRAGMENT,
            {
                uAmount: { value: settings.amount * 0.01, type: 'f32' },
                uMonochrome: { value: settings.monochrome / 100, type: 'f32' },
                uSeed: { value: settings.seed, type: 'f32' },
                uLinkAlpha: { value: settings.linkAlpha ? 1 : 0, type: 'f32' }
            },
            0
        ),
    isNoop: (settings: EffectSettings) => settings.amount <= 0
};

export default definition;