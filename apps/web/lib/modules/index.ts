import { AssistantModule } from "./assistant";

// Register all workspace modules
export function registerAllModules(): void {
  // Dynamic import to avoid circular deps
  const { getModuleRegistry } = require("../workspace/module-registry");
  const registry = getModuleRegistry();

  registry.register(AssistantModule);
  // Future modules:
  // registry.register(JournalModule);
  // registry.register(WatchlistModule);
  // registry.register(ResearchModule);
}

export { AssistantModule };
