import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const ANGLE = 2;
const QUALITY = 2;

const RADIAL_BLUR_FRAGMENT = `
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform sampler2D uTexture;

    uniform vec2 uCenter;
    uniform float uAngle;
    uniform float uQuality;

    void main()
    {
        if (uAngle <= 0.0)
        {
            gl_FragColor = texture2D(uTexture, vTextureCoord);
            return;
        }

        // Convert offset to pixel space to guarantee 1:1 circular rotation without aspect ratio distortion
        vec2 relPx = (vTextureCoord - uCenter) * uInputSize.xy;

        vec4 accum = vec4(0.0);
        float count = 0.0;

        // Dynamic sample count derived from quality setting (32 to 96 samples)
        int samples = int(16.0 + uQuality * 16.0);

        for (int i = 0; i < 96; i++)
        {
            if (i >= samples)
            {
                break;
            }

            // Map sample index across the full arc [-uAngle, +uAngle]
            float t = (float(i) / float(samples - 1) - 0.5) * 2.0;
            float currentAngle = t * uAngle;

            float c = cos(currentAngle);
            float s = sin(currentAngle);

            // Rotate pixel vector
            vec2 rotPx = vec2(relPx.x * c - relPx.y * s, relPx.x * s + relPx.y * c);
            vec2 sampleUV = uCenter + rotPx * uInputSize.zw;

            // Paint.NET boundary check
            if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0)
            {
                accum += texture2D(uTexture, sampleUV);
                count += 1.0;
            }
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
    label: 'Radial Blur',
    icon: '💫',
    params: [
        {
            key: 'angle',
            label: 'Angle',
            min: 0,
            max: 360,
            step: 1,
            default: ANGLE
        },
        {
            key: 'centerX',
            label: 'Center X',
            min: 0,
            max: 100,
            step: 1,
            default: 50
        },
        {
            key: 'centerY',
            label: 'Center Y',
            min: 0,
            max: 100,
            step: 1,
            default: 50
        },
        {
            key: 'quality',
            label: 'Quality',
            min: 1,
            max: 5,
            step: 1,
            default: QUALITY
        }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            RADIAL_BLUR_FRAGMENT,
            {
                uCenter: {
                    value: [settings.centerX / 100, settings.centerY / 100] as [number, number],
                    type: 'vec2<f32>'
                },
                uAngle: { value: (settings.angle * Math.PI) / 180, type: 'f32' },
                uQuality: { value: settings.quality, type: 'f32' }
            },
            0
        ),
    isNoop: (settings: EffectSettings) => settings.angle <= 0
};

export default definition;