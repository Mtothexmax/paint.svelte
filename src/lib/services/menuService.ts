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
		enabled: true,
		entries: [
			{ type: 'command', commandId: 'edit.undo' },
			{ type: 'command', commandId: 'edit.redo' },
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
		enabled: true,
		entries: [
			{ type: 'command', commandId: 'layers.add' },
			{ type: 'command', commandId: 'layers.duplicate' },
			{ type: 'command', commandId: 'layers.delete' },
			{ type: 'separator' },
			{ type: 'disabled', label: 'Merge Down' }
		]
	},
	{
		label: 'Adjustments',
		enabled: true,
		entries: [
			{ type: 'command', commandId: 'adjustments.hueSat' },
			{ type: 'disabled', label: 'Brightness…' },
			{ type: 'disabled', label: 'Contrast…' }
		]
	},
	{
		label: 'Effects',
		enabled: true,
		entries: [
			{ type: 'command', commandId: 'effects.blur' },
			{ type: 'disabled', label: 'Sharpen…' }
		]
	}
];
