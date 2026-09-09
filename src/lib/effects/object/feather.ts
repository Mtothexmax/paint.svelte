import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

// Object: Feather — smooths ONLY the alpha channel (the mask) at the edges,
// never the color values. This removes hard edges / white outlines from rough
// cutouts (Bolt Pack "Feather").
//
// Two inward-only operations, both clamped so the silhouette can never grow:
//  - Shrink erodes the alpha inward (like Outline expands outward, but in
//    reverse): any pixel within `shrink` texels of a transparent neighbour is
//    cut away.
//  - Feather blurs the (eroded) alpha and keeps `min(eroded, blurred)`, so
//    the soft transition falls inward from the edge instead of bleeding out.
//
// Wherever the result is fully transparent, RGB is cleared as well: invisible
// texels must not carry spilled color, otherwise minified (zoomed-out) views
// show a false colored fringe around the cut edge while 1:1 data stays clean.
const FEATHER_FRAGMENT = `
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uRadius;
    uniform float uShrink;

    void main()
    {
        vec4 c = texture(uTexture, vTextureCoord);
        vec2 px = uInputSize.zw;
        float r = min(uRadius, 10.0);
        float s = min(uShrink, 20.0);

        // Bound search radius to cover both shrink and feather
        float R = max(r, s);

        if (R <= 0.001) {
            finalColor = c;
            return;
        }

        float sigma = max(r * 0.5, 0.0001);
        float emin = c.a;
        float sum = 0.0;
        float weightSum = 0.0;

        for (int x = -20; x <= 20; x++) {
            float ax = abs(float(x));
            if (ax > R) continue;

            for (int y = -20; y <= 20; y++) {
                float ay = abs(float(y));
                float d = max(ax, ay);
                if (d > R) continue;

                vec2 offset = vec2(float(x), float(y)) * px;
                float a = texture(uTexture, vTextureCoord + offset).a;

                // Shrink / erosion
                if (d <= s) {
                    emin = min(emin, a);
                }

                // Feather weighting within user radius r
                if (r > 0.0 && d <= r) {
                    float w = exp(- (d * d) / (2.0 * sigma * sigma));
                    sum += a * w;
                    weightSum += w;
                }
            }
        }

        float newAlpha = emin;

        if (r > 0.0 && weightSum > 0.0) {
            float blurred = sum / weightSum;
            // Remap inward blur range [0.5, 1.0] -> [0.0, 1.0]
            float feathered = smoothstep(0.5, 1.0, blurred);
            newAlpha = min(emin, feathered);
        }

        // Clear RGB when fully transparent to prevent fringe artifacts
        if (newAlpha <= 0.0) {
            finalColor = vec4(0.0);
        } else {
            finalColor = vec4(c.rgb, newAlpha);
        }
    }
`;

const definition: EffectDefinition = {
    label: 'Feather',
    icon: '🪶',
    params: [
        {
            key: 'radius',
            label: 'Feather',
            min: 0,
            max: 10,
            step: 1,
            default: 3
        },
        {
            key: 'shrink',
            label: 'Shrink',
            min: 0,
            max: 20,
            step: 1,
            default: 0
        }
    ],
    filter: (settings: EffectSettings) =>
        makeGlFilter(FEATHER_FRAGMENT, {
            uRadius: { value: settings.radius ?? 0, type: 'f32' },
            uShrink: { value: settings.shrink ?? 0, type: 'f32' }
        }),
    isNoop: (settings: EffectSettings) => (settings.radius ?? 0) <= 0 && (settings.shrink ?? 0) <= 0
};

export default definition;
