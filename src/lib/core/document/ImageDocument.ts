// Layer: core (framework-free). Document model for one open image.

import { newId } from '../id';
import { type Layer, createRasterLayer, type SurfaceId } from '../layers/Layer';

export type DocId = string;

export interface ViewState {
	zoom: number; // scale factor (1 = 100%)
	panX: number; // image-space origin -> screen px
	panY: number;
}

export const defaultView: ViewState = { zoom: 1, panX: 0, panY: 0 };

/**
 * Placeholder for the (later) selection system. Slice 1 stores nothing real.
 */
export interface SelectionState {
	active: boolean;
}

export interface NewDocumentParams {
	name: string;
	width: number;
	height: number;
	surfaceId: SurfaceId;
	view?: ViewState;
}

export class ImageDocument {
	readonly id: DocId;
	name: string;
	width: number;
	height: number;
	layers: Layer[];
	activeLayerId: string;
	view: ViewState;
	selection: SelectionState;
	dirty: boolean;

	constructor(params: NewDocumentParams) {
		this.id = newId('doc');
		this.name = params.name;
		this.width = params.width;
		this.height = params.height;
		this.selection = { active: false };
		this.view = params.view ? { ...params.view } : { ...defaultView };
		this.dirty = false;

		const layer = createRasterLayer(params.surfaceId, 'Background');
		this.layers = [layer];
		this.activeLayerId = layer.id;
	}

	get activeLayer(): Layer | null {
		return this.layers.find((l) => l.id === this.activeLayerId) ?? null;
	}

	/** Marks the doc dirty (or clean). */
	setDirty(dirty: boolean): void {
		if (this.dirty !== dirty) this.dirty = dirty;
	}

	get displayName(): string {
		return this.name;
	}
}
