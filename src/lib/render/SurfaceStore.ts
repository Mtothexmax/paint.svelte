// Layer: render (pixi). Owns GPU-resident surfaces behind opaque SurfaceId keys.
// This is the only place (besides EditorRenderer / export) that touches pixi
// render targets in this slice.

import { Container, Graphics, RenderTexture, Sprite, Texture, type Application } from 'pixi.js';
import { newId } from '../core/id';
import { type Rect } from '../core/geometry';
import type { SurfaceId } from '../core/layers/Layer';

export type BlendName = 'normal' | 'erase' | 'none';

/** Layer blend-mode id → Pixi sprite blend mode (unknown falls back below). */
export const SPRITE_BLENDS: Record<string, Sprite['blendMode']> = {
	normal: 'normal',
	multiply: 'multiply',
	screen: 'screen',
	overlay: 'overlay',
	darken: 'darken',
	lighten: 'lighten',
	'color-dodge': 'color-dodge',
	'color-burn': 'color-burn',
	'hard-light': 'hard-light',
	'soft-light': 'soft-light',
	difference: 'difference',
	exclusion: 'exclusion',
	add: 'add'
};

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

	/** Clears an owned surface to transparent. */
	clear(id: SurfaceId): void {
		this.render(new Container(), this.getTexture(id), true);
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
	 *
	 * Pixi v8 quirk: a blend mode on the object that IS the render root is
	 * silently ignored (falls back to `normal`) — so 'erase' must be nested one
	 * level inside a Container to actually apply.
	 */
	blitRegion(srcId: SurfaceId, destId: SurfaceId, x: number, y: number, blend: BlendName = 'normal', alpha = 1): void {
		const src = this.getTexture(srcId);
		const dest = this.getTexture(destId);
		const sprite = new Sprite(src);
		sprite.position.set(x, y);
		sprite.blendMode = blend;
		sprite.alpha = alpha;
		const holder = new Container();
		holder.addChild(sprite);
		this.render(holder, dest, false);
		holder.destroy({ children: true });
	}

	/**
	 * Composites one layer surface over another (merge-down): `srcId` is drawn
	 * onto `destId` with the layer's opacity and blend-mode id (unknown ids
	 * fall back to normal). Both surfaces stay owned by the caller.
	 */
	compositeLayer(srcId: SurfaceId, destId: SurfaceId, alpha: number, blendMode: string): void {
		const sprite = new Sprite(this.getTexture(srcId));
		sprite.alpha = Math.max(0, Math.min(1, alpha));
		sprite.blendMode = SPRITE_BLENDS[blendMode] ?? 'normal';
		const holder = new Container();
		holder.addChild(sprite);
		this.render(holder, this.getTexture(destId), false);
		holder.destroy({ children: true });
	}

	/** Draws a surface with an affine transform around an image-space pivot. */
	blitTransformed(
		srcId: SurfaceId,
		destId: SurfaceId,
		sourcePivotX: number,
		sourcePivotY: number,
		worldPivotX: number,
		worldPivotY: number,
		offsetX: number,
		offsetY: number,
		scaleX: number,
		scaleY: number,
		rotation: number,
		blend: BlendName = 'normal'
	): void {
		const sprite = new Sprite(this.getTexture(srcId));
		sprite.anchor.set(sourcePivotX / sprite.texture.width, sourcePivotY / sprite.texture.height);
		sprite.position.set(worldPivotX + offsetX, worldPivotY + offsetY);
		sprite.scale.set(scaleX, scaleY);
		sprite.rotation = rotation;
		sprite.blendMode = blend;
		const holder = new Container();
		holder.addChild(sprite);
		this.render(holder, this.getTexture(destId), false);
		holder.destroy({ children: true });
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
