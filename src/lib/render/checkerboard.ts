// Layer: render (pixi). Builds a reusable checkerboard Texture once.

import { Texture } from 'pixi.js';

let cached: Texture | null = null;

/**
 * Returns a checkerboard texture. Each square is `square` CSS-px in screen
 * terms is handled by the caller via tileScale; here the base canvas is a
 * 2x2 grid of `square`-px squares.
 */
export function checkerTexture(square = 8): Texture {
	if (cached) return cached;
	const size = square * 2; // 2 squares per side
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, size, size);
	ctx.fillStyle = '#d0d0d0';
	// top-left and bottom-right squares shaded
	ctx.fillRect(0, 0, square, square);
	ctx.fillRect(square, square, square, square);
	cached = Texture.from(canvas);
	return cached;
}
