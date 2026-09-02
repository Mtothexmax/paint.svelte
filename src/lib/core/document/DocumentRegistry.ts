// Layer: core (framework-free). Owns the open documents and the active one.

import { Emitter } from '../events';
import { type DocId, ImageDocument } from './ImageDocument';

export const RegistryEvents = {
	/** payload: ImageDocument */
	opened: 'opened',
	/** payload: { id: DocId; doc: ImageDocument } */
	closed: 'closed',
	/** payload: { id: DocId | null } */
	active: 'active'
} as const;

export interface RegistryClosePayload {
	id: DocId;
	doc: ImageDocument;
}
export interface RegistryActivePayload {
	id: DocId | null;
}

export class DocumentRegistry {
	readonly events = new Emitter();
	private docs = new Map<DocId, ImageDocument>();
	private order: DocId[] = [];
	private activeDocId: DocId | null = null;

	get all(): ImageDocument[] {
		return this.order.map((id) => this.docs.get(id)!).filter(Boolean);
	}

	get count(): number {
		return this.order.length;
	}

	get active(): ImageDocument | null {
		if (!this.activeDocId) return null;
		return this.docs.get(this.activeDocId) ?? null;
	}

	get activeId(): DocId | null {
		return this.activeDocId;
	}

	getById(id: DocId): ImageDocument | null {
		return this.docs.get(id) ?? null;
	}

	open(doc: ImageDocument): void {
		if (this.docs.has(doc.id)) return;
		this.docs.set(doc.id, doc);
		this.order.push(doc.id);
		this.events.emit(RegistryEvents.opened, doc);
		// Opening a document focuses it (a fresh tab becomes active).
		this.setActive(doc.id);
	}

	close(id: DocId): void {
		const doc = this.docs.get(id);
		if (!doc) return;
		this.docs.delete(id);
		this.order = this.order.filter((d) => d !== id);
		this.events.emit(RegistryEvents.closed, { id, doc } satisfies RegistryClosePayload);
		if (this.activeDocId === id) {
			this.setActive(this.order.length ? this.order[this.order.length - 1] : null);
		}
	}

	setActive(id: DocId | null): void {
		if (id !== null && !this.docs.has(id)) return;
		this.activeDocId = id;
		this.events.emit(RegistryEvents.active, { id } satisfies RegistryActivePayload);
	}
}
