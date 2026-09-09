// Layer: core (framework-free). Layer model. Pixels live in the render layer,
// referenced here only through an opaque SurfaceId handle.

import { newId } from '../id';

export type LayerId = string;

/** Opaque handle to GPU-resident pixels. Only the render layer may resolve it. */
export type SurfaceId = string;

/** One live layer effect (non-destructive until baked). */
export interface LayerEffect {
	/** Effect definition id (e.g. 'outline'). */
	id: string;
	/** Settings object matching the effect's params. */
	settings: Record<string, number>;
	/** Enabled state — toggled without removing the effect. */
	enabled: boolean;
}

export interface Layer {
	id: LayerId;
	/** Extensible union — 'text' layers carry editable text (raster cache). */
	kind: 'raster' | 'text';
	name: string;
	visible: boolean;
	opacity: number; // 0..1
	blendMode: string; // one of LAYER_BLEND_MODES ('normal' default)
	surfaceId: SurfaceId;
	/** Present on text layers: the editable content (surfaceId caches it). */
	text?: TextContent;
	/** Live layer effects — rendered on top of the base surface every frame. */
	effects?: LayerEffect[];
}

/** Editable text content of a text layer (image px, straight RGBA bytes). */
export interface TextContent {
	/** Anchor: top-left of the text box in image px. */
	x: number;
	y: number;
	/** Rasterized box size (hit-testing + re-edit origin). */
	width: number;
	height: number;
	text: string;
	family: string;
	size: number;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	strike: boolean;
	align: 'left' | 'center' | 'right';
	color: { r: number; g: number; b: number; a: number };
}

/** Creates a raster layer wrapping a render-layer surface handle. */
export function createRasterLayer(surfaceId: SurfaceId, name: string): Layer {
	return {
		id: newId('layer'),
		kind: 'raster',
		name,
		visible: true,
		opacity: 1,
		blendMode: 'normal',
		surfaceId
	};
}

/** Creates a text layer (editable content + raster cache surface). */
export function createTextLayer(surfaceId: SurfaceId, name: string, text: TextContent): Layer {
	return {
		id: newId('layer'),
		kind: 'text',
		name,
		visible: true,
		opacity: 1,
		blendMode: 'normal',
		surfaceId,
		text: { ...text, color: { ...text.color } }
	};
}

/** Blend modes a layer can use (Pixi v8 blend names). */
export const LAYER_BLEND_MODES = [
	'normal',
	'multiply',
	'screen',
	'overlay',
	'darken',
	'lighten',
	'color-dodge',
	'color-burn',
	'hard-light',
	'soft-light',
	'difference',
	'exclusion',
	'add'
] as const;

export type LayerBlendMode = (typeof LAYER_BLEND_MODES)[number];

/** True for a known layer blend mode id. */
export function isLayerBlendMode(mode: string): mode is LayerBlendMode {
	return (LAYER_BLEND_MODES as readonly string[]).includes(mode);
}
