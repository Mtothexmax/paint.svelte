/** Tool ids that paint strokes onto the active layer. */
export const PAINT_TOOLS = new Set(['brush', 'pencil', 'eraser']);
/** Tool id for the eyedropper (color sampler). */
export const EYEDROPPER = 'eyedropper';
/** Maps paint tool ids to their stroke kind. */
export const KIND: Record<string, 'brush' | 'pencil' | 'eraser'> = {
	brush: 'brush',
	pencil: 'pencil',
	eraser: 'eraser'
};
/** Tool ids that create a selection region. */
export const SELECT_TOOLS = new Set(['select-rect', 'select-ellipse', 'lasso', 'select-poly']);
/** Maps selection tool ids to their selection kind. */
export const SELECT_KIND: Record<string, 'rect' | 'ellipse' | 'lasso'> = {
	'select-rect': 'rect',
	'select-ellipse': 'ellipse',
	lasso: 'lasso'
};
/** Minimum pointer travel (screen px) before a selection drag commits. */
export const SELECT_DRAG_MIN = 3;
