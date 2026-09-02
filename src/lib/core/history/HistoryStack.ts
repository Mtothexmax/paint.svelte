// Layer: core (framework-free). Per-document undo/redo history.
// Entries carry plain undo/redo/dispose closures — the paint/effect layers
// create them (so core stays pixi-free). UI only observes this.

export interface HistoryEntry {
	label: string;
	/** amount of GPU/RAM bytes retained while this entry is in the stack (0 = metadata). */
	memoryBytes?: number;
	undo: () => void;
	redo: () => void;
	/** releases snapshots when trimmed / dropped. */
	dispose: () => void;
}

export const HistoryEvents = {
	change: 'change'
} as const;

export class HistoryStack {
	private entries: HistoryEntry[] = [];
	private index = -1;
	private maxEntries: number;
	private listeners = new Set<() => void>();

	constructor(opts: { maxEntries?: number } = {}) {
		this.maxEntries = opts.maxEntries ?? 100;
	}

	get length(): number {
		return this.entries.length;
	}
	get cursor(): number {
		return this.index;
	}
	get canUndo(): boolean {
		return this.index >= 0;
	}
	get canRedo(): boolean {
		return this.index < this.entries.length - 1;
	}

	labels(): string[] {
		return this.entries.map((e) => e.label);
	}

	private emit() {
		for (const fn of this.listeners) fn();
	}

	subscribe(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	/** Adds a new entry; clears any redo branch above the cursor. */
	push(entry: HistoryEntry): void {
		// drop redo tail
		while (this.entries.length > this.index + 1) {
			const dropped = this.entries.pop()!;
			dropped.dispose();
		}
		this.entries.push(entry);
		this.index = this.entries.length - 1;
		// trim oldest if over the entry cap
		while (this.entries.length > this.maxEntries) {
			const oldest = this.entries.shift()!;
			oldest.dispose();
			this.index--;
		}
		this.emit();
	}

	undo(): boolean {
		if (!this.canUndo) return false;
		const entry = this.entries[this.index];
		entry.undo();
		this.index--;
		this.emit();
		return true;
	}

	redo(): boolean {
		if (!this.canRedo) return false;
		this.index++;
		this.entries[this.index].redo();
		this.emit();
		return true;
	}

	clear(): void {
		for (const e of this.entries) e.dispose();
		this.entries = [];
		this.index = -1;
		this.emit();
	}
}
