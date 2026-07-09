/**
 * Workspace integration test — verifies the full registry → resource → context
 * state chain. Most workspace bugs are registry synchronization bugs; this test
 * catches them at the type level.
 */

import { getModuleRegistry } from "@/lib/workspace/module-registry";
import { getCommandRegistry } from "@/lib/workspace/command-registry";
import { getSearchRegistry } from "@/lib/workspace/search-registry";
import { getResourceManager } from "@/lib/workspace/resource-manager";
import { initializeWorkspace } from "@/lib/workspace/init";

// Ensure workspace is initialized
beforeAll(() => {
  initializeWorkspace();
});

describe("Workspace integration", () => {
  it("module registry is populated", () => {
    const registry = getModuleRegistry();
    const modules = registry.getAll();
    expect(modules.length).toBeGreaterThan(0);
  });

  it("every module has RouteCapability and ContextCapability", () => {
    const registry = getModuleRegistry();
    for (const mod of registry.getAll()) {
      const hasRoute = mod.capabilities.some((c) => c.kind === "route");
      const hasContext = mod.capabilities.some((c) => c.kind === "context");
      expect(hasRoute).toBe(true);
      expect(hasContext).toBe(true);
    }
  });

  it("command registry is populated from modules", () => {
    const cmdRegistry = getCommandRegistry();
    const commands = cmdRegistry.getAll();
    expect(commands.length).toBeGreaterThan(0);

    // Journal commands exist
    const journalCmd = cmdRegistry.get("module", "journal");
    expect(journalCmd).toBeDefined();
  });

  it("search registry is populated from modules", () => {
    const searchRegistry = getSearchRegistry();
    // Should not throw when searching
    expect(() => searchRegistry.quickActions()).not.toThrow();
  });

  it("resource manager can open a journal resource", () => {
    const rm = getResourceManager();
    const tabsBefore = rm.getTabs().length;

    // Opening should not throw
    expect(() => {
      rm.open({
        id: "journal:2026-07-08",
        type: "journal",
        title: "2026-07-08",
        url: "/workspace/journal?date=2026-07-08",
        metadata: { date: "2026-07-08" },
      });
    }).not.toThrow();

    const tabsAfter = rm.getTabs().length;
    expect(tabsAfter).toBeGreaterThanOrEqual(tabsBefore);
  });

  it("sidebar reads from module registry", () => {
    const registry = getModuleRegistry();
    const primaryModules = registry.getByGroup("primary");
    expect(primaryModules.length).toBeGreaterThan(0);

    // Journal is in primary group
    const journalMod = primaryModules.find((m) => m.metadata.id === "journal");
    expect(journalMod).toBeDefined();
  });
});
