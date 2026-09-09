// Layer: effects. Tiny helpers for building custom GLSL filters on the Pixi v8
// WebGL pipeline. Mirrors how Pixi's own filters construct themselves:
//   new Filter({ glProgram, resources: { filterUniforms }, padding })

import { Filter, GlProgram, UniformGroup, defaultFilterVert } from 'pixi.js';
import { documentRegistry } from '../core/document/registry';

export type GlUniform =
	| { value: number; type: 'f32' }
	| { value: [number, number]; type: 'vec2<f32>' }
	| { value: [number, number, number]; type: 'vec3<f32>' }
	| { value: [number, number, number, number]; type: 'vec4<f32>' };

/**
 * Reusable GLSL3 fragment preamble: deterministic hash, value noise and
 * 4-octave fBm. Splice ONCE per fragment before main().
 */
export const NOISE_GLSL = `
	float hash(vec2 p)
	{
		return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
	}

	float valueNoise(vec2 p)
	{
		vec2 i = floor(p);
		vec2 f = fract(p);
		vec2 u = f * f * (3.0 - 2.0 * f);
		float a = hash(i);
		float b = hash(i + vec2(1.0, 0.0));
		float c = hash(i + vec2(0.0, 1.0));
		float d = hash(i + vec2(1.0, 1.0));
		return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
	}

	float fbm(vec2 p)
	{
		float v = 0.0;
		float amp = 0.5;
		for (int i = 0; i < 4; i++)
		{
			v += amp * valueNoise(p);
			p *= 2.02;
			amp *= 0.5;
		}
		return v;
	}
`;

/**
 * Shared GLSL preamble for the Adjustments effects.
 *
 * Layer surfaces are stored PREMULTIPLIED, but every tonal operation (levels,
 * curves, exposure, posterize …) is defined on STRAIGHT (unassociated) colour.
 * Sample through `adjustSample()` and write back through `adjustOutput()`:
 * they undo and re-apply the premultiplication so semi-transparent pixels keep
 * their hue instead of drifting toward black. `luma()` is the Rec. 601
 * luminance Paint.NET uses for intensity-based adjustments.
 */
export const ADJUST_GLSL = `
	vec4 adjustSample(sampler2D tex, vec2 uv)
	{
		vec4 c = texture(tex, uv);
		return c.a > 0.0 ? vec4(c.rgb / c.a, c.a) : vec4(0.0, 0.0, 0.0, 0.0);
	}

	vec4 adjustOutput(vec3 rgb, float a)
	{
		return vec4(clamp(rgb, 0.0, 1.0) * a, a);
	}

	float luma(vec3 c)
	{
		return dot(c, vec3(0.299, 0.587, 0.114));
	}
`;

/** Current active document's aspect ratio (width/height). */
export function documentAspect(): number {
	const doc = documentRegistry.active;
	if (!doc || !doc.height) return 1;
	return doc.width / doc.height;
}

/**
 * Builds a Filter from a fragment shader source. The default Pixi vertex
 * provides `vTextureCoord` plus the `uInputSize` / `uOutputFrame` /
 * `uOutputTexture` transform uniforms (uInputSize.zw = texel size), and the
 * input texture is bound to `uTexture`. Your fragment must declare the
 * built-ins it uses, e.g.:
 *
 *   in vec2 vTextureCoord;
 *   uniform highp vec4 uInputSize; // MUST match vertex precision (highp) or link fails
 *   uniform sampler2D uTexture;
 *   out vec4 finalColor;
 */
export function makeGlFilter(
	fragment: string,
	uniforms: Record<string, GlUniform>,
	padding = 0
): Filter {
	const filterUniforms = new UniformGroup(uniforms);
	const glProgram = GlProgram.from({
		vertex: defaultFilterVert,
		fragment,
		name: 'custom-effect'
	});
	return new Filter({ glProgram, resources: { filterUniforms }, padding });
}