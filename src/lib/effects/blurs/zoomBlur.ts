import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const AMOUNT = 10;

const ZOOM_FRAGMENT = `
    precision highp float;

    varying vec2 vTextureCoord;
    uniform sampler2D uTexture;

    uniform vec2 uCenter;
    uniform float uAmount;

    void main()
    {
        vec2 rel = vTextureCoord - uCenter;

        // Paint.NET bit-shift decay conversion: (fx >> 4) * fZ >> 10  =>  fx * (uAmount / 16384.0)
        float decay = 1.0 - (uAmount / 16384.0);

        vec4 accum = vec4(0.0);
        float count = 0.0;

        // Exact Paint.NET loop count (64 iterations)
        for (int i = 0; i < 64; i++)
        {
            vec2 sampleUV = uCenter + rel;

            // Bounds check (sourceBounds.Contains)
            if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0)
            {
                accum += texture2D(uTexture, sampleUV);
                count += 1.0;
            }

            rel *= decay;
        }

        if (count > 0.0)
        {
            gl_FragColor = accum / count;
        }
        else
        {
            gl_FragColor = vec4(0.0);
        }
    }
`;

const definition: EffectDefinition = {
    label: 'Zoom Blur',
    icon: '🎯',
    params: [
        {
            key: 'amount',
            label: 'Amount',
            min: 0,
            max: 100,
            step: 1,
            default: AMOUNT
        },
        { key: 'centerX', label: 'Center X', min: 0, max: 100, step: 1, default: 50 },
        { key: 'centerY', label: 'Center Y', min: 0, max: 100, step: 1, default: 50 }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            ZOOM_FRAGMENT,
            {
                uCenter: {
                    value: [settings.centerX / 100, settings.centerY / 100] as [number, number],
                    type: 'vec2<f32>'
                },
                uAmount: { value: settings.amount, type: 'f32' }
            },
            0
        ),
    isNoop: (settings: EffectSettings) => settings.amount <= 0
};

export default definition;