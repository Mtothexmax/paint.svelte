// Layer: core (framework-free). Document model for one open image.

import { newId } from '../id';
import { type Layer, createRasterLayer, type SurfaceId } from '../layers/Layer';
import { HistoryStack } from '../history/HistoryStack';
import { emptySelection, type SelectionModel } from '../selection/SelectionModel';

export type DocId = string;

export interface ViewState {
	zoom: number; // scale factor (1 = 100%)
	panX: number; // image-space origin -> screen px
	panY: number;
}

export const defaultView: ViewState = { zoom: 1, panX: 0, panY: 0 };

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
	selection: SelectionModel;
	dirty: boolean;
	history: HistoryStack;

	constructor(params: NewDocumentParams) {
		this.id = newId('doc');
		this.name = params.name;
		this.width = params.width;
		this.height = params.height;
		this.selection = emptySelection();
		this.view = params.view ? { ...params.view } : { ...defaultView };
		this.dirty = false;
		this.history = new HistoryStack();

		const layer = createRasterLayer(params.surfaceId, 'Background');
		this.layers = [layer];
		this.activeLayerId = layer.id;
	}

	get activeLayer(): Layer | null {
		return this.layers.find((l) => l.id === this.activeLayerId) ?? null;
	}

	indexOfLayer(id: string): number {
		return this.layers.findIndex((l) => l.id === id);
	}

	setActiveLayer(id: string): void {
		if (this.layers.some((l) => l.id === id)) this.activeLayerId = id;
	}

	/** Inserts `layer` at `index` (default: top). index 0 = bottom. */
	insertLayer(layer: Layer, index: number): void {
		const i = Math.max(0, Math.min(index, this.layers.length));
		this.layers.splice(i, 0, layer);
	}

	/** Removes a layer, returns its index (or -1). */
	removeLayer(id: string): number {
		const idx = this.indexOfLayer(id);
		if (idx >= 0) this.layers.splice(idx, 1);
		return idx;
	}

	moveLayer(id: string, toIndex: number): void {
		const from = this.indexOfLayer(id);
		if (from < 0) return;
		const target = Math.max(0, Math.min(toIndex, this.layers.length - 1));
		if (from === target) return;
		const [layer] = this.layers.splice(from, 1);
		this.layers.splice(target, 0, layer);
	}

	setLayerVisible(id: string, visible: boolean): void {
		const l = this.layers.find((x) => x.id === id);
		if (l) l.visible = visible;
	}

	setLayerOpacity(id: string, opacity: number): void {
		const l = this.layers.find((x) => x.id === id);
		if (l) l.opacity = Math.max(0, Math.min(1, opacity));
	}

	/** Marks the doc dirty (or clean). */
	setDirty(dirty: boolean): void {
		if (this.dirty !== dirty) this.dirty = dirty;
	}

	get displayName(): string {
		return this.name;
	}
}
