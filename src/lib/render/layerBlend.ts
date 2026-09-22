// Layer: render (pixi). Off-screen compositing for the "advanced" layer
// blend modes (difference, exclusion, overlay, darken, lighten,
// color-dodge, color-burn, hard-light, soft-light).
//
// Pixi v8 implements these as backdrop-sampling filters, and the WebGL
// backbuffer they sample only exists when rendering to the SCREEN —
// rendering the same sprite into a surface leaves the backdrop empty, so
// the layer silently composites as `normal` there (verified: difference
// over green read back as pure red). Merge-down, export, flatten and the
// clipboard all composite into surfaces, so they cannot use
// `sprite.blendMode` for these modes.
//
// This module blends through a dedicated filter whose backdrop is an
// explicit snapshot of the destination. The shader math is Pixi's own
// per-mode GLSL (MIT, from pixi.js advanced-blend-modes) over the same
// premultiplied inputs the live path sees, so off-screen results match the
// canvas exactly.

import { Filter, GlProgram, UniformGroup, defaultFilterVert, type Texture } from 'pixi.js';

/** Pixi blend-mode id → uMode index in the fragment shader below. */
const MODE_INDEX: Record<string, number> = {
	overlay: 0,
	darken: 1,
	lighten: 2,
	'color-dodge': 3,
	'color-burn': 4,
	'hard-light': 5,
	'soft-light': 6,
	difference: 7,
	exclusion: 8
};

/** uMode index for an advanced blend mode, or null for native ones
 * (normal, multiply, screen, add) which composite via `sprite.blendMode`. */
export function advancedBlendModeIndex(mode: string): number | null {
	const i = MODE_INDEX[mode];
	return typeof i === 'number' ? i : null;
}

const FRAGMENT = `
	in vec2 vTextureCoord;
	out vec4 finalColor;

	uniform sampler2D uTexture;
	uniform sampler2D uBackdrop;
	uniform float uMode;

	float overlay(float base, float blend)
	{
		return (base < 0.5) ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
	}
	vec3 blendOverlay(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			overlay(base.r, blend.r),
			overlay(base.g, blend.g),
			overlay(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	vec3 blendDarken(vec3 base, vec3 blend, float opacity)
	{
		return (min(base, blend) * opacity + base * (1.0 - opacity));
	}

	vec3 blendLighten(vec3 base, vec3 blend, float opacity)
	{
		return (max(base, blend) * opacity + base * (1.0 - opacity));
	}

	float colorDodge(float base, float blend)
	{
		return base / (1.0 - blend);
	}
	vec3 blendColorDodge(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			colorDodge(base.r, blend.r),
			colorDodge(base.g, blend.g),
			colorDodge(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	float colorBurn(float base, float blend)
	{
		return max((1.0 - ((1.0 - base) / blend)), 0.0);
	}
	vec3 blendColorBurn(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			colorBurn(base.r, blend.r),
			colorBurn(base.g, blend.g),
			colorBurn(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	float hardLight(float base, float blend)
	{
		return (blend < 0.5) ? 2.0 * base * blend : 1.0 - 2.0 * (1.0 - base) * (1.0 - blend);
	}
	vec3 blendHardLight(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			hardLight(base.r, blend.r),
			hardLight(base.g, blend.g),
			hardLight(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	float softLight(float base, float blend)
	{
		return (blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend));
	}
	vec3 blendSoftLight(vec3 base, vec3 blend, float opacity)
	{
		vec3 blended = vec3(
			softLight(base.r, blend.r),
			softLight(base.g, blend.g),
			softLight(base.b, blend.b)
		);
		return (blended * opacity + base * (1.0 - opacity));
	}

	vec3 blendDifference(vec3 base, vec3 blend, float opacity)
	{
		return (abs(blend - base) * opacity + base * (1.0 - opacity));
	}

	vec3 exclusion(vec3 base, vec3 blend)
	{
		return base + blend - 2.0 * base * blend;
	}
	vec3 blendExclusion(vec3 base, vec3 blend, float opacity)
	{
		return (exclusion(base, blend) * opacity + base * (1.0 - opacity));
	}

	void main()
	{
		vec4 back = texture(uBackdrop, vTextureCoord);
		vec4 front = texture(uTexture, vTextureCoord);
		float blendedAlpha = front.a + back.a * (1.0 - front.a);
		vec3 blended = back.rgb;
		if (uMode < 0.5) blended = blendOverlay(back.rgb, front.rgb, front.a);
		else if (uMode < 1.5) blended = blendDarken(back.rgb, front.rgb, front.a);
		else if (uMode < 2.5) blended = blendLighten(back.rgb, front.rgb, front.a);
		else if (uMode < 3.5) blended = blendColorDodge(back.rgb, front.rgb, front.a);
		else if (uMode < 4.5) blended = blendColorBurn(back.rgb, front.rgb, front.a);
		else if (uMode < 5.5) blended = blendHardLight(back.rgb, front.rgb, front.a);
		else if (uMode < 6.5) blended = blendSoftLight(back.rgb, front.rgb, front.a);
		else if (uMode < 7.5) blended = blendDifference(back.rgb, front.rgb, front.a);
		else blended = blendExclusion(back.rgb, front.rgb, front.a);
		finalColor = vec4(blended, blendedAlpha);
	}
`;

/**
 * Single-layer advanced blend over an explicit backdrop snapshot.
 * `backdrop` must cover exactly the sprite's destination rect (the caller
 * snapshots it) so `vTextureCoord` addresses both textures 1:1. The sprite
 * carries the layer opacity in its alpha, exactly like the live path.
 */
export class LayerBlendFilter extends Filter {
	constructor(modeIndex: number, backdrop: Texture) {
		super({
			glProgram: GlProgram.from({
				vertex: defaultFilterVert,
				fragment: FRAGMENT,
				name: 'layer-blend'
			}),
			resources: {
				blendStatics: new UniformGroup({ uMode: { value: modeIndex, type: 'f32' } }),
				uBackdrop: backdrop.source
			}
		});
	}
}
