"use client";

import { AssistantModule } from "./assistant";
import { WatchlistModule } from "./watchlist";
import { KnowledgeModule } from "./knowledge";
import { ResearchModule } from "./research";
import { MemoryModule } from "./memory";
import { getModuleRegistry } from "../workspace/module-registry";
import { getCommandRegistry } from "../workspace/command-registry";
import { getSearchRegistry } from "../workspace/search-registry";
import { getToolRegistry } from "../workspace/tool-registry";
import type {
  CommandCapability,
  SearchCapability,
  ToolCapability,
} from "../workspace/types";

const ALL_MODULES = [
  AssistantModule,
  WatchlistModule,
  KnowledgeModule,
  ResearchModule,
  MemoryModule,
];

export function registerAllModules(): void {
  const moduleRegistry = getModuleRegistry();
  const commandRegistry = getCommandRegistry();
  const searchRegistry = getSearchRegistry();

  for (const mod of ALL_MODULES) {
    try {
      const hasRoute = mod.capabilities.some((c) => c.kind === "route");
      const hasContext = mod.capabilities.some((c) => c.kind === "context");
      if (!hasRoute || !hasContext) {
        console.warn(
          `[Workspace] Module "${mod.metadata.id}" missing required capabilities: ${!hasRoute ? "RouteCapability" : ""} ${!hasContext ? "ContextCapability" : ""}`,
        );
      }

      moduleRegistry.register(mod);

      for (const cap of mod.capabilities) {
        switch (cap.kind) {
          case "command":
            for (const cmd of (cap as CommandCapability).commands) {
              commandRegistry.register(cmd);
            }
            break;
          case "search":
            searchRegistry.register(
              mod.metadata.id,
              (cap as SearchCapability).provider,
            );
            break;
          case "tool":
            for (const tool of (cap as ToolCapability).tools) {
              getToolRegistry().register(tool);
            }
            break;
          // route, context, inspector, widget, shortcut, action
          // are stored on the module's capabilities array and accessed
          // via ModuleRegistry lookups — no separate registration needed.
        }
      }
    } catch (err) {
      console.warn(
        `[Workspace] Failed to register module "${mod.metadata.id}":`,
        err,
      );
    }
  }
}

export {
  AssistantModule,
  WatchlistModule,
  KnowledgeModule,
  ResearchModule,
  MemoryModule,
};
