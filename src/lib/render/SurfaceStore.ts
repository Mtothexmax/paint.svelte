// Layer: render (pixi). Owns GPU-resident surfaces behind opaque SurfaceId keys.
// This is the only place (besides EditorRenderer / export) that touches pixi
// render targets in this slice.

import { Container, Graphics, RenderTexture, Sprite, Texture, type Application } from 'pixi.js';
import { newId } from '../core/id';
import { type Rect } from '../core/geometry';
import type { SurfaceId } from '../core/layers/Layer';

export type BlendName = 'normal' | 'erase' | 'none';

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

	/** Registers an already-created RenderTexture as an owned surface. */
	adopt(rt: RenderTexture): SurfaceId {
		const id = newId('sfc');
		this.surfaces.set(id, rt);
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

	/** Copies a region of a surface into a new owned surface (GPU→GPU). */
	copyRegion(id: SurfaceId, rect: Rect): SurfaceId {
		const source = this.getTexture(id);
		const out = RenderTexture.create({ width: rect.width, height: rect.height, resolution: 1 });
		const outId = newId('sfc');
		this.surfaces.set(outId, out);

		const sprite = new Sprite(source);
		const holder = new Container();
		sprite.position.set(-rect.x, -rect.y);
		holder.addChild(sprite);
		this.render(holder, out, true);
		holder.destroy({ children: true });
		return outId;
	}

	/**
	 * Draws a (region-sized) surface into another surface at `x`,`y`, optionally
	 * with a blend mode and an overall alpha.
	 */
	blitRegion(srcId: SurfaceId, destId: SurfaceId, x: number, y: number, blend: BlendName = 'normal', alpha = 1): void {
		const src = this.getTexture(srcId);
		const dest = this.getTexture(destId);
		const sprite = new Sprite(src);
		sprite.position.set(x, y);
		sprite.blendMode = blend;
		sprite.alpha = alpha;
		this.render(sprite, dest, false);
		sprite.destroy();
	}

	/** Renders a container into a target texture (used by the paint engine). */
	renderInto(target: RenderTexture, container: Container, clear = false): void {
		this.render(container, target, clear);
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
