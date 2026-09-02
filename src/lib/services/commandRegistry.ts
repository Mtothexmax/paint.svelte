// Layer: services. Single source of truth for commands: labels, shortcuts,
// availability (enabled predicates) and execution (plan A8).

export interface CommandDef {
	id: string;
	label: string;
	/** Human display shortcut, e.g. "Ctrl+S". */
	shortcut?: string;
	run: () => void | Promise<void>;
	isEnabled?: () => boolean;
}

class CommandRegistry {
	private map = new Map<string, CommandDef>();

	register(def: CommandDef): void {
		this.map.set(def.id, def);
	}

	registerMany(defs: CommandDef[]): void {
		for (const def of defs) this.register(def);
	}

	get(id: string): CommandDef | undefined {
		return this.map.get(id);
	}

	has(id: string): boolean {
		return this.map.has(id);
	}

	isEnabled(id: string): boolean {
		const def = this.map.get(id);
		if (!def) return false;
		return def.isEnabled ? def.isEnabled() : true;
	}

	label(id: string): string {
		return this.map.get(id)?.label ?? id;
	}

	shortcut(id: string): string | undefined {
		return this.map.get(id)?.shortcut;
	}

	/** Runs a command; returns false when it is disabled/unknown. */
	run(id: string): boolean {
		const def = this.map.get(id);
		if (!def || !this.isEnabled(id)) return false;
		void def.run();
		return true;
	}

	all(): CommandDef[] {
		return [...this.map.values()];
	}
}

export const commands = new CommandRegistry();
