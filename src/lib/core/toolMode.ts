// Layer: core. Sub-modes of the "Move Selected Pixels" tool. Kept in core so
// both the state layer (options strip) and the render layer (MoveEngine and
// its mode modules) can use the same vocabulary without importing each other.

/** Sub-modes of the Move-Pixels tool.
 * - `move`    — translate the floating selection (the move logic).
 * - `rotate`  — rotate / scale about the pivot (the former "transform" logic).
 * - `distort` — free 4-corner warp (placeholder; see render/move/distortLogic). */
export type MoveToolMode = 'move' | 'rotate' | 'distort';

/** All sub-modes in display order. */
export const MOVE_TOOL_MODES: readonly MoveToolMode[] = ['move', 'rotate', 'distort'];

/** Human readable labels for the options strip. */
export const MOVE_TOOL_MODE_LABELS: Record<MoveToolMode, string> = {
	move: 'Move',
	rotate: 'Rotate',
	distort: 'Distort'
};

export function isMoveToolMode(v: unknown): v is MoveToolMode {
	return v === 'move' || v === 'rotate' || v === 'distort';
}
