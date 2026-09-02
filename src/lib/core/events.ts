// Layer: core (framework-free). Tiny typed-ish emitter for domain events.

type Handler = (payload: unknown) => void;

/**
 * Minimal event emitter used by domain classes so they can notify adapters /
 * renderer without depending on Svelte or any framework.
 */
export class Emitter {
	private listeners = new Map<string, Set<Handler>>();

	/** Subscribe. Returns an unsubscribe function. */
	on(event: string, handler: Handler): () => void {
		let set = this.listeners.get(event);
		if (!set) {
			set = new Set();
			this.listeners.set(event, set);
		}
		set.add(handler);
		return () => this.off(event, handler);
	}

	off(event: string, handler: Handler): void {
		this.listeners.get(event)?.delete(handler);
	}

	emit(event: string, payload?: unknown): void {
		const set = this.listeners.get(event);
		if (!set) return;
		for (const handler of [...set]) {
			handler(payload);
		}
	}

	removeAll(): void {
		this.listeners.clear();
	}
}
