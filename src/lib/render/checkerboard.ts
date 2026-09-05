// Layer: render (pixi). Builds a reusable checkerboard Texture per theme.

import { Texture } from 'pixi.js';

export type CheckerTheme = 'bright' | 'dark';

const cached = new Map<CheckerTheme, Texture>();

/**
 * Returns a checkerboard texture. Each square is `square` CSS-px in screen
 * terms is handled by the caller via tileScale; here the base canvas is a
 * 2x2 grid of `square`-px squares. Bright = white/light-gray (as before),
 * dark = gray/black.
 */
export function checkerTexture(square = 8, theme: CheckerTheme = 'bright'): Texture {
	const hit = cached.get(theme);
	if (hit) return hit;
	const size = square * 2; // 2 squares per side
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	const base = theme === 'dark' ? '#241f21' : '#ffffff';
	const shade = theme === 'dark' ? '#000000' : '#d0d0d0';
	ctx.fillStyle = base;
	ctx.fillRect(0, 0, size, size);
	ctx.fillStyle = shade;
	// top-left and bottom-right squares shaded
	ctx.fillRect(0, 0, square, square);
	ctx.fillRect(square, square, square, square);
	const tex = Texture.from(canvas);
	cached.set(theme, tex);
	return tex;
}
