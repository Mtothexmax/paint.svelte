// Layer: core (framework-free). Pure geometry helpers and types.

export interface Point {
	x: number;
	y: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function clamp(value: number, min: number, max: number): number {
	return value < min ? min : value > max ? max : value;
}

export function clampInt(value: number, min: number, max: number): number {
	return Math.round(clamp(value, min, max));
}

/** true when the point is inside the rect (inclusive of edges). */
export function pointInRect(px: number, py: number, rect: Rect): boolean {
	return px >= rect.x && px < rect.x + rect.width && py >= rect.y && py < rect.y + rect.height;
}

export function rectsEqual(a: Rect, b: Rect): boolean {
	return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function makeRect(x: number, y: number, width: number, height: number): Rect {
	return { x, y, width, height };
}
