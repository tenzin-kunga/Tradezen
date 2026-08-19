import type { SlashCommand } from "./types";

class CommandRegistryImpl {
  private commands = new Map<string, SlashCommand>();

  register(command: SlashCommand): void {
    const key = `${command.namespace}:${command.command}`;
    this.commands.set(key, command);
  }

  unregister(namespace: string, command: string): void {
    this.commands.delete(`${namespace}:${command}`);
  }

  get(namespace: string, command: string): SlashCommand | undefined {
    return this.commands.get(`${namespace}:${command}`);
  }

  getByNamespace(namespace: string): SlashCommand[] {
    return Array.from(this.commands.values()).filter(
      (c) => c.namespace === namespace,
    );
  }

  getAll(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  parse(input: string): { command: SlashCommand; args: string } | null {
    if (!input.startsWith("/")) return null;

    const spaceIdx = input.indexOf(" ");
    const commandPart =
      spaceIdx === -1 ? input.slice(1) : input.slice(1, spaceIdx);
    const args = spaceIdx === -1 ? "" : input.slice(spaceIdx + 1);

    // Search across all namespaces
    for (const command of this.commands.values()) {
      if (command.command === commandPart) {
        return { command, args };
      }
    }
    return null;
  }
}

let instance: CommandRegistryImpl | null = null;

export function getCommandRegistry(): CommandRegistryImpl {
  if (!instance) {
    instance = new CommandRegistryImpl();
  }
  return instance;
}
