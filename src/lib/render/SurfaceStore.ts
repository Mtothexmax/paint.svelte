// Layer: render (pixi). Owns GPU-resident surfaces behind opaque SurfaceId keys.
// This is the only place (besides EditorRenderer / export) that touches pixi
// render targets in this slice.

import { Container, Graphics, RenderTexture, Sprite, Texture, type Application } from 'pixi.js';
import { newId } from '../core/id';
import type { SurfaceId } from '../core/layers/Layer';

export class SurfaceStore {
	private app: Application | null = null;
	private surfaces = new Map<SurfaceId, RenderTexture>();

	attach(app: Application): void {
		this.app = app;
	}

	private requireApp(): Application {
		if (!this.app) throw new Error('SurfaceStore has no Application attached.');
		return this.app;
	}

	private render(container: Container, target: RenderTexture, clear: boolean): void {
		const app = this.requireApp();
		app.renderer.render({ container, target, clear });
	}

	/** Creates an empty (transparent) surface. Optionally fills it with a color. */
	create(width: number, height: number, fillColor?: number): SurfaceId {
		const id = newId('sfc');
		const rt = RenderTexture.create({ width, height, resolution: 1 });
		this.surfaces.set(id, rt);
		if (fillColor !== undefined) this.fill(id, fillColor);
		return id;
	}

	/** Uploads an ImageBitmap into an owned surface (GPU copy). */
	createFromBitmap(bitmap: ImageBitmap): SurfaceId {
		const texture = Texture.from(bitmap);
		const width = texture.width;
		const height = texture.height;
		const id = newId('sfc');
		const rt = RenderTexture.create({ width, height, resolution: 1 });
		this.surfaces.set(id, rt);

		const sprite = new Sprite(texture);
		this.render(sprite, rt, true);
		sprite.destroy();
		texture.destroy();
		return id;
	}

	has(id: SurfaceId): boolean {
		return this.surfaces.has(id);
	}

	getTexture(id: SurfaceId): RenderTexture {
		const tex = this.surfaces.get(id);
		if (!tex) throw new Error(`Unknown surface: ${id}`);
		return tex;
	}

	/** Fills the entire surface with a solid color. */
	fill(id: SurfaceId, color: number): void {
		const rt = this.getTexture(id);
		const g = new Graphics();
		g.rect(0, 0, rt.width, rt.height).fill(color);
		this.render(g, rt, true);
		g.destroy();
	}

	dispose(id: SurfaceId): void {
		const tex = this.surfaces.get(id);
		if (!tex) return;
		tex.destroy(true);
		this.surfaces.delete(id);
	}

	disposeAll(): void {
		for (const tex of this.surfaces.values()) tex.destroy(true);
		this.surfaces.clear();
	}
}
