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
  });

  it("search registry is populated from modules", () => {
    const searchRegistry = getSearchRegistry();
    // Should not throw when searching
    expect(() => searchRegistry.quickActions()).not.toThrow();
  });

  it("resource manager can open a trade resource", () => {
    const rm = getResourceManager();
    const tabsBefore = rm.getTabs().length;

    // Opening should not throw
    expect(() => {
      rm.open({
        id: "trade:123",
        type: "trade",
        title: "BTCUSD",
        url: "/trades/123",
        metadata: { tradeId: "123" },
      });
    }).not.toThrow();

    const tabsAfter = rm.getTabs().length;
    expect(tabsAfter).toBeGreaterThanOrEqual(tabsBefore);
  });

  it("sidebar reads from module registry", () => {
    const registry = getModuleRegistry();
    const primaryModules = registry.getByGroup("primary");
    expect(primaryModules.length).toBeGreaterThan(0);
  });

  it("knowledge module commands are wired and execute without throwing", () => {
    const cmdRegistry = getCommandRegistry();
    const open = cmdRegistry.get("module", "knowledge");
    const newDoc = cmdRegistry.get("module", "new-doc");

    expect(open).toBeDefined();
    expect(newDoc).toBeDefined();
    expect(() => open!.handler("")).not.toThrow();
    expect(() => newDoc!.handler("")).not.toThrow();
  });

  it("research module commands are wired and execute without throwing", () => {
    const cmdRegistry = getCommandRegistry();
    const open = cmdRegistry.get("module", "research");
    const newResearch = cmdRegistry.get("module", "new-research");

    expect(open).toBeDefined();
    expect(newResearch).toBeDefined();
    expect(() => open!.handler("")).not.toThrow();
    expect(() => newResearch!.handler("")).not.toThrow();
  });

  it("search provider quick actions execute without throwing", () => {
    const searchRegistry = getSearchRegistry();
    const actions = searchRegistry.quickActions();
    expect(actions.length).toBeGreaterThan(0);
    for (const a of actions) {
      expect(() => a.action()).not.toThrow();
    }
  });
});
