// Layer: services. Declarative menu tree. Command items reference command ids
// (labels/shortcuts/enabled come from the CommandRegistry); disabled groups are
// placeholders for future slices.

export type MenuEntry =
	| { type: 'command'; commandId: string }
	| { type: 'disabled'; label: string; shortcut?: string }
	| { type: 'separator' };

export interface MenuDef {
	label: string;
	enabled: boolean;
	entries: MenuEntry[];
}

export const MENUS: MenuDef[] = [
	{
		label: 'File',
		enabled: true,
		entries: [
			{ type: 'command', commandId: 'file.new' },
			{ type: 'command', commandId: 'file.open' },
			{ type: 'separator' },
			{ type: 'command', commandId: 'file.save' },
			{ type: 'command', commandId: 'file.close' }
		]
	},
	{
		label: 'View',
		enabled: true,
		entries: [
			{ type: 'command', commandId: 'view.zoomIn' },
			{ type: 'command', commandId: 'view.zoomOut' },
			{ type: 'separator' },
			{ type: 'command', commandId: 'view.actualSize' },
			{ type: 'command', commandId: 'view.fitWindow' }
		]
	},
	{
		label: 'Edit',
		enabled: false,
		entries: [
			{ type: 'disabled', label: 'Undo', shortcut: 'Ctrl+Z' },
			{ type: 'disabled', label: 'Redo', shortcut: 'Ctrl+Y' },
			{ type: 'separator' },
			{ type: 'disabled', label: 'Cut', shortcut: 'Ctrl+X' },
			{ type: 'disabled', label: 'Copy', shortcut: 'Ctrl+C' },
			{ type: 'disabled', label: 'Paste', shortcut: 'Ctrl+V' }
		]
	},
	{
		label: 'Image',
		enabled: false,
		entries: [
			{ type: 'disabled', label: 'Resize…' },
			{ type: 'disabled', label: 'Canvas Size…' },
			{ type: 'disabled', label: 'Rotate 90°' },
			{ type: 'disabled', label: 'Crop to Selection' }
		]
	},
	{
		label: 'Layers',
		enabled: false,
		entries: [
			{ type: 'disabled', label: 'Add New Layer' },
			{ type: 'disabled', label: 'Delete Layer' },
			{ type: 'disabled', label: 'Duplicate Layer' }
		]
	},
	{
		label: 'Adjustments',
		enabled: false,
		entries: [
			{ type: 'disabled', label: 'Brightness…' },
			{ type: 'disabled', label: 'Contrast…' },
			{ type: 'disabled', label: 'Saturation…' }
		]
	},
	{
		label: 'Effects',
		enabled: false,
		entries: [
			{ type: 'disabled', label: 'Gaussian Blur…' },
			{ type: 'disabled', label: 'Sharpen…' }
		]
	}
];
