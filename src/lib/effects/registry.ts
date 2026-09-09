// Layer: effects. Auto-discovery registry.
//
// Every effect is one file under `src/lib/effects/<menu>/<id>.ts` that
// default-exports an EffectDefinition. Vite's import.meta.glob collects them
// all at build time, so adding an effect requires NO registry edits — just
// drop a file in and it appears in the Effects menu and gets its command.

import type { EffectDefinition, EffectSettings, ResolvedEffect } from './types';

/** Canonical top-level menu order (unknown menus sort last, alphabetically). */
const MENU_ORDER = ['blurs', 'distort', 'noise', 'photo', 'render', 'stylize'];

function titleCase(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function isEffectDefinition(value: unknown): value is EffectDefinition {
	if (!value || typeof value !== 'object') return false;
	const def = value as Partial<EffectDefinition>;
	return (
		typeof def.label === 'string' &&
		Array.isArray(def.params) &&
		typeof def.filter === 'function'
	);
}

// Infra files (types.ts, registry.ts, index.ts, apply.ts, shaders.ts) have no
// default EffectDefinition export, so they are filtered out automatically.
const modules = import.meta.glob<{ default?: unknown }>('./**/*.ts', { eager: true });

const all: ResolvedEffect[] = [];

for (const [path, mod] of Object.entries(modules)) {
	const entry = mod.default;
	if (!isEffectDefinition(entry)) continue;

	const clean = path.replace(/^\.\//, '').replace(/\.ts$/, '');
	const parts = clean.split('/');
	const fileName = parts[parts.length - 1];
	if (!fileName) continue;
	const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
	const id = fileName;

	all.push({
		...entry,
		id,
		menu: entry.menu ?? (folder ? titleCase(folder.split('/').pop()!) : 'Effects'),
		defaults: Object.fromEntries(
			entry.params.map((p) => [p.key, p.default])
		) as EffectSettings
	});
}

/** All registered effects, sorted by label within each menu. */
export const effects: readonly ResolvedEffect[] = [...all].sort((a, b) =>
	a.label.localeCompare(b.label)
);

/**
 * Menu label of the top-level "Adjustments" menu. Everything in the
 * `adjustments/` folder is lifted OUT of the Effects submenus and surfaced as
 * its own top-level menu (Paint.NET groups tonal adjustments separately).
 */
export const ADJUSTMENTS_MENU = 'Adjustments';

/** All adjustments, sorted by label — drives the top-level Adjustments menu. */
export const adjustmentEffects: readonly ResolvedEffect[] = effects.filter(
	(e) => e.menu === ADJUSTMENTS_MENU
);

/** Menu submenu labels that actually have at least one effect. */
export const effectMenus: readonly string[] = MENU_ORDER.filter((menu) =>
	effects.some((e) => e.menu.toLowerCase().replace(/[^a-z]/g, '') === menu)
).map(titleCase);

/** Effects grouped into submenus, sorted to match the canonical order. The
 * Adjustments group is excluded — it has its own top-level menu. */
export const effectMenusWithEntries: readonly { label: string; effects: ResolvedEffect[] }[] = [
	...effects
		.filter((e) => e.menu !== ADJUSTMENTS_MENU)
		.reduce((map, e) => {
		const list = map.get(e.menu) ?? [];
		list.push(e);
		map.set(e.menu, list);
		return map;
	}, new Map<string, ResolvedEffect[]>()),
]
	.sort((a, b) => {
		const key = (label: string) => MENU_ORDER.indexOf(label.toLowerCase().replace(/[^a-z]/g, ''));
		const ai = key(a[0]);
		const bi = key(b[0]);
		return (ai === -1 ? MENU_ORDER.length : ai) - (bi === -1 ? MENU_ORDER.length : bi) || a[0].localeCompare(b[0]);
	})
	.map(([label, effects]) => ({ label, effects }));

export function effectById(id: string): ResolvedEffect | undefined {
	return effects.find((e) => e.id === id);
}