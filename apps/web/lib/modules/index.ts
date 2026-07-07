import { AssistantModule } from "./assistant";
import { JournalModule } from "./journal";
import { WatchlistModule } from "./watchlist";
import { KnowledgeModule } from "./knowledge";
import { ResearchModule } from "./research";
import { PortfolioModule } from "./portfolio";
import { MemoryModule } from "./memory";
import { FilesModule } from "./files";

// Register all workspace modules
export function registerAllModules(): void {
  const { getModuleRegistry } = require("../workspace/module-registry");
  const registry = getModuleRegistry();

  registry.register(AssistantModule);
  registry.register(JournalModule);
  registry.register(WatchlistModule);
  registry.register(KnowledgeModule);
  registry.register(ResearchModule);
  registry.register(PortfolioModule);
  registry.register(MemoryModule);
  registry.register(FilesModule);
  // Future modules:
  // registry.register(CalendarModule);
}

export {
  AssistantModule,
  JournalModule,
  WatchlistModule,
  KnowledgeModule,
  ResearchModule,
  PortfolioModule,
  MemoryModule,
  FilesModule,
};
