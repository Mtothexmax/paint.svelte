// Layer: effects. Core types for the auto-registered effect system.
//
// User-facing convention: each effect lives in its own file underneath
// `src/lib/effects/<menu>/` and exports a single EffectDefinition as the
// DEFAULT export. The folder name becomes the menu submenu label, the file
// name becomes the effect id, and the params/settings JSON-schema the dialog
// is built from. Registering a new effect = adding a new file.

import type { Filter } from 'pixi.js';
import type { EditorRenderer } from '../render/EditorRenderer';

/** A single slider/parameter in the generic effect dialog. */
export interface EffectParam {
	/** An effect is "no-op" (Apply disabled) at its default value by default */
	key: string;
	label: string;
	min: number;
	max: number;
	step?: number;
	default: number;
	/** Optional CSS background painted on the slider track */
	gradient?: string;
}

export type EffectSettings = Record<string, number>;

/** Runtime context handed to effects that need a custom apply pipeline. */
export interface EffectContext {
	renderer: EditorRenderer;
	/** The standard off-screen filter-swap apply (undoable surface swap). */
	applyFilterSwap: (label: string, makeFilter: () => Filter) => boolean;
}

/**
 * Declarative effect definition. `params` fully drive both the settings
 * object and the generated dialog; `filter(settings)` must return a NEW
 * filter instance per call (the preview and the apply each own one).
 */
export interface EffectDefinition {
	/** Menu label of the effect (e.g. "Gaussian Blur"). */
	label: string;
	/** Overrides the default menu derived from the file's folder name. */
	menu?: string;
	/** Emoji shown next to the effect in the menu. */
	icon?: string;
	/** Sliders shown in the dialog, in order. */
	params: EffectParam[];
	/** Builds a NEW filter for the current settings (preview + apply). */
	filter: (settings: EffectSettings) => Filter;
	/** True when the settings cause no visible change (disables Apply). */
	isNoop?: (settings: EffectSettings) => boolean;
	/**
	 * Optional custom dialog id (registered in DialogHost) that replaces the
	 * generated slider sheet — for adjustments whose UI is not just sliders
	 * (Curves). The dialog receives the standard `EffectDialogPayload`.
	 */
	dialog?: string;
	/** Optional custom apply pipeline; defaults to a generic filter swap. */
	apply?: (ctx: EffectContext, settings: EffectSettings) => boolean;
}

/** An EffectDefinition resolved by the registry with derived fields filled in. */
export interface ResolvedEffect extends EffectDefinition {
	/** Stable unique id, defaults to the file name. */
	id: string;
	/** Menu submenu label, defaults to the folder name title-cased. */
	menu: string;
	/** Settings object where every param is at its default. */
	defaults: EffectSettings;
}