// Layer: services (browser util, no framework). Reads GPU limits for UI/validation.

let cached: number | null = null;

/** Returns the device MAX_TEXTURE_SIZE (e.g. 8192/16384), or null if unknown. */
export function deviceMaxTextureSize(): number | null {
	if (cached !== null) return cached;
	try {
		const canvas = document.createElement('canvas');
		const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as
			| WebGL2RenderingContext
			| WebGLRenderingContext
			| null;
		if (!gl) return (cached = null);
		cached = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
		return cached;
	} catch {
		return (cached = null);
	}
}
