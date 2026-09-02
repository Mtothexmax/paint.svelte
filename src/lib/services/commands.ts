// Layer: services. Registers the built-in Slice 1 commands (File/View).

import { documentRegistry } from '../core/document/registry';
import { statusBar } from '../state/ui';
import { getEditorRenderer } from '../render/EditorRenderer';
import { fitView, zoomTo } from '../render/Viewport';
import { commands } from './commandRegistry';
import { closeDialog, openDialog } from './dialogService';
import {
	closeActiveDocument,
	createNewDocument,
	exportActiveDocument,
	openFromPicker
} from './fileService';
import type { ViewState } from '../core/document/ImageDocument';
import { addLayer, deleteLayer, duplicateLayer } from './layersService';
import { deleteSelection, deselect, invertSelection, selectAll } from './selectionService';

function setStatusZoom(view: ViewState): void {
	statusBar.update((s) => ({ ...s, zoomPct: Math.round(view.zoom * 100) }));
}

/** Runs `fn(doc.view, w, h)`, mutating the active view, then re-syncs. */
function applyViewCommand(fn: (view: ViewState, vw: number, vh: number) => ViewState): boolean {
	const doc = documentRegistry.active;
	if (!doc) return false;
	const renderer = getEditorRenderer();
	doc.view = fn(doc.view, renderer.viewWidth, renderer.viewHeight);
	renderer.refreshActiveView();
	setStatusZoom(doc.view);
	return true;
}

let registered = false;

/** Registers built-in commands once. Safe to call multiple times. */
export function registerBuiltinCommands(): void {
	if (registered) return;
	registered = true;

	const hasDoc = () => !!documentRegistry.active;

	commands.registerMany([
		{
			id: 'file.new',
			label: 'New…',
			shortcut: 'Ctrl+Alt+N',
			run: () => openDialog('newImage')
		},
		{ id: 'file.open', label: 'Open…', shortcut: 'Ctrl+O', run: () => openFromPicker() },
		{
			id: 'file.save',
			label: 'Save As PNG…',
			shortcut: 'Ctrl+S',
			run: () => void exportActiveDocument(),
			isEnabled: hasDoc
		},
		{
			id: 'file.close',
			label: 'Close Tab',
			shortcut: 'Ctrl+F4',
			run: () => closeActiveDocument(),
			isEnabled: hasDoc
		},

		{
			id: 'view.zoomIn',
			label: 'Zoom In',
			shortcut: 'Ctrl+=',
			run: () =>
				applyViewCommand((v, vw, vh) => zoomTo(v, { x: vw / 2, y: vh / 2 }, v.zoom * 1.2)),
			isEnabled: hasDoc
		},
		{
			id: 'view.zoomOut',
			label: 'Zoom Out',
			shortcut: 'Ctrl+-',
			run: () =>
				applyViewCommand((v, vw, vh) => zoomTo(v, { x: vw / 2, y: vh / 2 }, v.zoom / 1.2)),
			isEnabled: hasDoc
		},
		{
			id: 'view.actualSize',
			label: 'Actual Size',
			shortcut: 'Ctrl+1',
			run: () =>
				applyViewCommand((v, vw, vh) => zoomTo(v, { x: vw / 2, y: vh / 2 }, 1)),
			isEnabled: hasDoc
		},
		{
			id: 'view.fitWindow',
			label: 'Fit to Window',
			shortcut: 'Ctrl+0',
			run: () =>
				applyViewCommand((_v, vw, vh) => {
					const doc = documentRegistry.active!;
					return fitView(doc.width, doc.height, vw, vh);
				}),
			isEnabled: hasDoc
		}
	]);

	commands.registerMany([
		{
			id: 'edit.undo',
			label: 'Undo',
			// Ctrl+Z is handled directly in EditorCanvas (layout-robust).
			run: () => {
				const doc = documentRegistry.active;
				if (doc) {
					doc.history.undo();
					documentRegistry.notifyChange(doc);
				}
			},
			isEnabled: () => !!documentRegistry.active?.history.canUndo
		},
		{
			id: 'edit.redo',
			label: 'Redo',
			// Ctrl+Y / Ctrl+Shift+Z handled directly in EditorCanvas.
			run: () => {
				const doc = documentRegistry.active;
				if (doc) {
					doc.history.redo();
					documentRegistry.notifyChange(doc);
				}
			},
			isEnabled: () => !!documentRegistry.active?.history.canRedo
		}
	]);

	commands.registerMany([
		{
			id: 'edit.selectAll',
			label: 'Select All',
			shortcut: 'Ctrl+A',
			// Ctrl+A is handled directly in EditorCanvas (capture phase +
			// stopPropagation, so the shortcut service never double-fires).
			run: () => selectAll(),
			isEnabled: hasDoc
		},
		{
			id: 'edit.deselect',
			label: 'Deselect',
			shortcut: 'Ctrl+D',
			run: () => deselect(),
			isEnabled: () => !!documentRegistry.active?.selection.active
		},
		{
			id: 'edit.invertSelection',
			label: 'Invert Selection',
			shortcut: 'Ctrl+I',
			run: () => invertSelection(),
			isEnabled: () => !!documentRegistry.active?.selection.active
		},
		{
			id: 'edit.delete',
			label: 'Delete',
			shortcut: 'Del',
			run: () => deleteSelection(),
			isEnabled: () => !!documentRegistry.active?.selection.active
		}
	]);

	commands.registerMany([
		{
			id: 'effects.blur',
			label: 'Gaussian Blur…',
			run: () => openDialog('blur'),
			isEnabled: hasDoc
		}
	]);

	commands.registerMany([
		{
			id: 'adjustments.hueSat',
			label: 'Hue / Saturation…',
			run: () => openDialog('hueSat'),
			isEnabled: hasDoc
		}
	]);

	commands.registerMany([
		{ id: 'layers.add', label: 'Add New Layer', run: () => addLayer(), isEnabled: hasDoc },
		{
			id: 'layers.duplicate',
			label: 'Duplicate Layer',
			run: () => {
				const d = documentRegistry.active;
				if (d?.activeLayer) duplicateLayer(d.activeLayer.id);
			},
			isEnabled: () => !!documentRegistry.active?.activeLayer
		},
		{
			id: 'layers.delete',
			label: 'Delete Layer',
			run: () => {
				const d = documentRegistry.active;
				if (d && d.layers.length > 1) deleteLayer(d.activeLayerId ?? undefined);
			},
			isEnabled: () => {
				const d = documentRegistry.active;
				return !!d && d.layers.length > 1;
			}
		}
	]);
}

export { closeDialog };
export type { NewCanvasRequest } from './fileService';
export { createNewDocument };
