// Layer: services. Declarative menu tree. Command items reference command ids
// (labels/shortcuts/enabled come from the CommandRegistry); disabled groups are
// placeholders for future slices.

import { adjustmentEffects, effectMenusWithEntries } from '../effects';

export type MenuEntry =
	| { type: 'command'; commandId: string }
	| { type: 'disabled'; label: string; shortcut?: string }
	| { type: 'separator' }
	| { type: 'submenu'; label: string; entries: MenuEntry[] };

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
			{ type: 'command', commandId: 'view.fitWindow' },
			{ type: 'separator' },
			{ type: 'command', commandId: 'view.checkerDark' }
		]
	},
	{
		label: 'Edit',
		enabled: true,
		entries: [
			{ type: 'command', commandId: 'edit.undo' },
			{ type: 'command', commandId: 'edit.redo' },
			{ type: 'separator' },
			{ type: 'command', commandId: 'edit.cut' },
			{ type: 'command', commandId: 'edit.copy' },
			{ type: 'command', commandId: 'edit.paste' },
			{ type: 'separator' },
			{ type: 'command', commandId: 'edit.selectAll' },
			{ type: 'command', commandId: 'edit.deselect' },
			{ type: 'command', commandId: 'edit.invertSelection' },
			{ type: 'command', commandId: 'edit.delete' }
		]
	},
	{
		label: 'Image',
		enabled: true,
		entries: [
			{ type: 'command', commandId: 'image.resize' },
			{ type: 'command', commandId: 'image.canvasSize' },
			{ type: 'disabled', label: 'Rotate 90°' },
			{ type: 'command', commandId: 'image.cropToSelection' }
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
			// Alphabetical list of registered adjustments + the instant Invert Colors.
			...[
				...adjustmentEffects.map((e) => ({
					label: e.label,
					commandId: `effects.${e.id}`
				})),
				{ label: 'Invert Colors', commandId: 'adjustments.invertColors' }
			]
				.sort((a, b) => a.label.localeCompare(b.label))
				.map((e) => ({ type: 'command' as const, commandId: e.commandId }))
		]
	},
	{
		label: 'Effects',
		enabled: true,
		entries: [
			...effectMenusWithEntries.map(({ label, effects }) => ({
				type: 'submenu' as const,
				label,
				entries: effects.map(
					(e) => ({ type: 'command' as const, commandId: `effects.${e.id}` })
				)
			})),
			{ type: 'disabled', label: 'Sharpen…' }
		]
	}
];
