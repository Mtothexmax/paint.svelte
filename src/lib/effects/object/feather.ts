import type { EffectDefinition, EffectSettings } from '../types';
import { makeGlFilter } from '../shaders';

// Feather — smooths ONLY the alpha channel.
//
// Pipeline:
//
//   source alpha
//       ↓
//   shrink / erosion
//       ↓
//   feather / blur
//       ↓
//   clamp so the silhouette can never grow
//
// The important difference from the previous implementation is that the
// shrink amount is applied to the edge position BEFORE the feather transition
// is calculated. This prevents the blur from bringing the edge back outward.
//
// RGB is kept from the original image and scaled together with alpha so that
// premultiplied-alpha invariants remain intact.

const FEATHER_FRAGMENT = `
    in vec2 vTextureCoord;
    out vec4 finalColor;

    uniform sampler2D uTexture;
    uniform highp vec4 uInputSize;
    uniform float uRadius;
    uniform float uShrink;

    // Sample alpha.
    float alphaAt(vec2 uv)
    {
        return texture(uTexture, uv).a;
    }

    // Estimate how far the current pixel is from a hard alpha boundary.
    //
    // This is intentionally cheap: instead of doing a complete morphological
    // erosion for every blur sample, we determine whether the current pixel
    // has transparent neighbours and use that information to move the feather
    // transition inward.
    float edgeStrength(vec2 uv, vec2 px)
    {
        float a = alphaAt(uv);

        float left  = alphaAt(uv - vec2(px.x, 0.0));
        float right = alphaAt(uv + vec2(px.x, 0.0));
        float up    = alphaAt(uv - vec2(0.0, px.y));
        float down  = alphaAt(uv + vec2(0.0, px.y));

        float diagonal =
            alphaAt(uv + vec2( px.x,  px.y)) +
            alphaAt(uv + vec2(-px.x,  px.y)) +
            alphaAt(uv + vec2( px.x, -px.y)) +
            alphaAt(uv + vec2(-px.x, -px.y));

        float neighbourMin = min(
            min(left, right),
            min(up, down)
        );

        neighbourMin = min(
            neighbourMin,
            min(
                min(
                    alphaAt(uv + vec2( px.x,  px.y)),
                    alphaAt(uv + vec2(-px.x,  px.y))
                ),
                min(
                    alphaAt(uv + vec2( px.x, -px.y)),
                    alphaAt(uv + vec2(-px.x, -px.y))
                )
            )
        );

        // 1 when surrounded by opaque pixels, 0 when neighbouring pixels are
        // transparent. This gives us an inexpensive estimate of the edge.
        float localEdge = abs(a - neighbourMin);

        return clamp(localEdge, 0.0, 1.0);
    }

    // Gaussian weight.
    float gaussian(float distance, float sigma)
    {
        return exp(-(distance * distance) / (2.0 * sigma * sigma));
    }

    void main()
    {
        vec4 original = texture(uTexture, vTextureCoord);

        float radius = clamp(uRadius, 0.0, 10.0);
        float shrink = clamp(uShrink, 0.0, 20.0);

        if (radius <= 0.001 && shrink <= 0.001)
        {
            finalColor = original;
            return;
        }

        vec2 px = uInputSize.zw;

        // ------------------------------------------------------------------
        // 1. Determine the alpha after shrink.
        //
        // For opaque/antialiased masks we use a local minimum morphology.
        // The search radius is limited to 20 px by the UI.
        // ------------------------------------------------------------------

        float eroded = original.a;

        if (shrink > 0.001)
        {
            float s = ceil(shrink);

            for (int y = -20; y <= 20; y++)
            {
                if (float(abs(y)) > s)
                    continue;

                for (int x = -20; x <= 20; x++)
                {
                    if (float(abs(x)) > s)
                        continue;

                    // Chebyshev distance gives the same square morphology
                    // used by the original implementation.
                    float d = max(abs(float(x)), abs(float(y)));

                    if (d <= s)
                    {
                        vec2 offset = vec2(float(x), float(y)) * px;
                        eroded = min(
                            eroded,
                            alphaAt(vTextureCoord + offset)
                        );
                    }
                }
            }
        }

        // If erosion removed the pixel completely there is no reason to
        // perform the expensive feather operation.
        if (eroded <= 0.0001)
        {
            finalColor = vec4(0.0);
            return;
        }

        // ------------------------------------------------------------------
        // 2. Feather the SHRUNken edge.
        //
        // We cannot literally feed "eroded" into another GPU pass from a
        // single fragment shader, so instead we approximate the sequential
        // morphology+blur operation by shifting the blur transition inward.
        //
        // The eroded mask above establishes the new edge. The Gaussian below
        // only operates around that edge.
        // ------------------------------------------------------------------

        if (radius <= 0.001)
        {
            float ratio =
                original.a > 0.0001
                    ? eroded / original.a
                    : 0.0;

            finalColor = vec4(
                original.rgb * ratio,
                eroded
            );

            return;
        }

        float sigma = max(radius * 0.5, 0.0001);

        float sum = 0.0;
        float weightSum = 0.0;

        float R = ceil(radius);

        for (int y = -10; y <= 10; y++)
        {
            if (float(abs(y)) > R)
                continue;

            for (int x = -10; x <= 10; x++)
            {
                if (float(abs(x)) > R)
                    continue;

                float d = max(abs(float(x)), abs(float(y)));

                if (d > R)
                    continue;

                vec2 offset = vec2(float(x), float(y)) * px;

                // Sample the original mask.
                float a = alphaAt(vTextureCoord + offset);

                // The erosion distance is represented by reducing the
                // contribution of samples which are close to the old edge.
                //
                // This keeps the feather transition on the inside of the
                // shrunken silhouette instead of allowing the Gaussian to
                // recreate the old outer edge.
                float shrinkFactor = 1.0;

                if (shrink > 0.0)
                {
                    float distanceFromCenter = length(vec2(
                        float(x),
                        float(y)
                    ));

                    float inner =
                        smoothstep(
                            shrink,
                            max(shrink + radius, shrink + 0.001),
                            distanceFromCenter
                        );

                    shrinkFactor = inner;
                }

                float w = gaussian(d, sigma);

                sum += a * w * shrinkFactor;
                weightSum += w * shrinkFactor;
            }
        }

        float blurred =
            weightSum > 0.0
                ? sum / weightSum
                : eroded;

        // ------------------------------------------------------------------
        // 3. Convert the blur into a soft edge.
        //
        // Using smoothstep rather than simply returning the Gaussian average
        // produces a more "Feather Object" style transition.
        // ------------------------------------------------------------------

        float feathered = smoothstep(
            0.5,
            1.0,
            blurred
        );

        // The silhouette must NEVER become larger than the eroded mask.
        float newAlpha = min(eroded, feathered);

        // Preserve the original alpha when the feather operation is not
        // actually reducing it.
        newAlpha = min(newAlpha, original.a);

        if (newAlpha <= 0.0001)
        {
            finalColor = vec4(0.0);
            return;
        }

        // PixiJS filter textures are premultiplied-alpha.
        //
        // If alpha goes from A → B, RGB must be multiplied by B/A.
        float ratio =
            original.a > 0.0001
                ? newAlpha / original.a
                : 0.0;

        finalColor = vec4(
            original.rgb * ratio,
            newAlpha
        );
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
            uRadius: {
                value: settings.radius ?? 0,
                type: 'f32'
            },
            uShrink: {
                value: settings.shrink ?? 0,
                type: 'f32'
            }
        }),

    isNoop: (settings: EffectSettings) =>
        (settings.radius ?? 0) <= 0 &&
        (settings.shrink ?? 0) <= 0
};

export default definition;

