// Layer: core (framework-free). Layer model. Pixels live in the render layer,
// referenced here only through an opaque SurfaceId handle.

import { newId } from '../id';

export type LayerId = string;

/** Opaque handle to GPU-resident pixels. Only the render layer may resolve it. */
export type SurfaceId = string;

export interface Layer {
	id: LayerId;
	/** Extensible union — non-raster kinds (text/shape/…) added later. */
	kind: 'raster';
	name: string;
	visible: boolean;
	opacity: number; // 0..1
	blendMode: string; // 'normal' for now
	surfaceId: SurfaceId;
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
