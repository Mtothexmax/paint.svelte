import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

const AMOUNT = 30;
const RADIUS_PERCENTAGE = 100;
const CENTER_X = 50;
const CENTER_Y = 50;

// Exact port of Rick Brewster's Paint.NET Twist algorithm using pixel-space metrics and cubic falloff
const TWIST_FRAGMENT = `
    in vec2 vTextureCoord;
    uniform highp vec4 uInputSize;
    uniform sampler2D uTexture;
    out vec4 finalColor;

    uniform vec2 uCenter;
    uniform float uAmount;
    uniform float uRadiusPercentage;

    void main()
    {
        vec2 px = vTextureCoord * uInputSize.xy;
        vec2 center = uCenter * uInputSize.xy;

        float halfWidth = uInputSize.x * 0.5;
        float halfHeight = uInputSize.y * 0.5;
        float radiusBasis = min(halfWidth, halfHeight);
        float maxRadius = radiusBasis * (uRadiusPercentage / 100.0);

        vec2 p = px - center;
        float rSq = dot(p, p);

        // If sample falls outside twist circle, return original pixel
        if (rSq > maxRadius * maxRadius || maxRadius <= 0.0) {
            finalColor = texture(uTexture, vTextureCoord);
            return;
        }

        float r = sqrt(rSq);
        float radialFactor = 1.0 - (r / maxRadius);
        float twistAmount = radialFactor * radialFactor * radialFactor; // Cubic falloff

        float preliminaryTwist = -uAmount;
        float twistSetting = (preliminaryTwist * abs(preliminaryTwist)) / 100.0;
        float localTwist = twistAmount * twistSetting;

        float c = cos(localTwist);
        float s = sin(localTwist);
        mat2 rot = mat2(c, -s, s, c);
        vec2 rotatedP = rot * p;

        vec2 sourcePx = center + rotatedP;
        vec2 sourceUv = sourcePx * uInputSize.zw;

        finalColor = texture(uTexture, sourceUv);
    }
`;

const definition: EffectDefinition = {
    label: 'Twist',
    icon: '🌀',
    params: [
        {
            key: 'amount',
            label: 'Amount',
            min: -100,
            max: 100,
            step: 1,
            default: AMOUNT
        },
        {
            key: 'radiusPercentage',
            label: 'Radius Percentage',
            min: 0,
            max: 100,
            step: 1,
            default: RADIUS_PERCENTAGE
        },
        {
            key: 'center',
            label: 'Center',
            kind: 'xy',
            minX: 0,
            maxX: 100,
            minY: 0,
            maxY: 100,
            step: 1,
            default: CENTER_X,
            defaultY: CENTER_Y,
            yDown: true
        }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(
            TWIST_FRAGMENT,
            {
                uCenter: {
                    value: [settings.centerX / 100, settings.centerY / 100],
                    type: 'vec2<f32>'
                },
                uAmount: { value: settings.amount, type: 'f32' },
                uRadiusPercentage: { value: settings.radiusPercentage, type: 'f32' }
            },
            0
        ),
    isNoop: (settings: EffectSettings) => settings.amount === 0
};

export default definition;