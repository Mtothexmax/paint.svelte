import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const ANGLE = 25;
const DISTANCE = 10;

const MOTION_BLUR_FRAGMENT = `
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 uInputSize;
    uniform sampler2D uTexture;

    uniform float uAngle;
    uniform float uDistance;
    uniform float uCentered;
    uniform float uEdgeMode; // 0: Clamp, 1: Wrap, 2: Mirror, 3: Transparent

    vec2 getWrapUV(vec2 uv)
    {
        return fract(uv);
    }

    vec2 getMirrorUV(vec2 uv)
    {
        return 1.0 - abs(fract(uv * 0.5) * 2.0 - 1.0);
    }

    vec4 sampleTexture(vec2 uv)
    {
        if (uEdgeMode > 2.5) // Transparent
        {
            if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
            {
                return vec4(0.0);
            }
            return texture2D(uTexture, uv);
        }
        else if (uEdgeMode > 1.5) // Mirror
        {
            return texture2D(uTexture, getMirrorUV(uv));
        }
        else if (uEdgeMode > 0.5) // Wrap
        {
            return texture2D(uTexture, getWrapUV(uv));
        }
        else // Clamp
        {
            return texture2D(uTexture, clamp(uv, 0.0, 1.0));
        }
    }

    void main()
    {
        if (uDistance <= 0.0)
        {
            gl_FragColor = texture2D(uTexture, vTextureCoord);
            return;
        }

        vec2 texel = uInputSize.zw;
        
        // Paint.NET direction vector: end = (-dist * cos(theta), dist * sin(theta))
        vec2 endOffset = vec2(-uDistance * cos(uAngle), uDistance * sin(uAngle)) * texel;
        vec2 startOffset = uCentered > 0.5 ? -0.5 * endOffset : vec2(0.0);

        vec4 acc = vec4(0.0);
        const int SAMPLES = 32;

        for (int i = 0; i < SAMPLES; i++)
        {
            float t = float(i) / float(SAMPLES - 1);
            vec2 uv = vTextureCoord + startOffset + t * endOffset;
            acc += sampleTexture(uv);
        }

        gl_FragColor = acc / float(SAMPLES);
    }
`;

const definition: EffectDefinition = {
    label: 'Motion Blur',
    icon: '🎞️',
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
            key: 'distance',
            label: 'Distance',
            min: 0,
            max: 200,
            step: 1,
            default: DISTANCE
        },
        {
            key: 'centered',
            label: 'Centered',
            kind: 'checkbox',
            min: 0,
            max: 1,
            step: 1,
            default: 1
        },
        {
            key: 'edgeBehavior',
            label: 'Edge Behavior (0:Clamp, 1:Wrap, 2:Mirror, 3:Transparent)',
            min: 0,
            max: 3,
            step: 1,
            default: 0
        }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            MOTION_BLUR_FRAGMENT,
            {
                uAngle: { value: (settings.angle * Math.PI) / 180, type: 'f32' },
                uDistance: { value: settings.distance, type: 'f32' },
                uCentered: { value: settings.centered ? 1 : 0, type: 'f32' },
                uEdgeMode: { value: settings.edgeBehavior ?? 0, type: 'f32' }
            },
            0 // Set padding to 0 so vTextureCoord [0,1] strictly aligns with image boundaries
        ),
    isNoop: (settings: EffectSettings) => settings.distance <= 0
};

export default definition;