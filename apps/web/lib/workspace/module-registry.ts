import type {
  WorkspaceModule,
  ModuleMetadata,
  WorkspaceCapability,
  RouteCapability,
  SearchCapability,
  ContextCapability,
  ToolCapability,
  CommandCapability,
  ShortcutCapability,
  ActionCapability,
  WidgetCapability,
} from "./types";

class ModuleRegistryImpl {
  private modules = new Map<string, WorkspaceModule>();

  register(module: WorkspaceModule): void {
    if (this.modules.has(module.metadata.id)) {
      console.warn(
        `[ModuleRegistry] Module "${module.metadata.id}" already registered, overwriting`,
      );
    }
    this.modules.set(module.metadata.id, module);
  }

  get(id: string): WorkspaceModule | undefined {
    return this.modules.get(id);
  }

  getAll(): WorkspaceModule[] {
    return Array.from(this.modules.values()).sort(
      (a, b) => a.metadata.navOrder - b.metadata.navOrder,
    );
  }

  getByGroup(group: ModuleMetadata["navGroup"]): WorkspaceModule[] {
    return this.getAll().filter((m) => m.metadata.navGroup === group);
  }

  // Capability lookups
  getCapability<T extends WorkspaceCapability>(
    id: string,
    ctor: new (...args: unknown[]) => T,
  ): T | undefined {
    const mod = this.modules.get(id);
    if (!mod) return undefined;
    return mod.capabilities.find((c) => c instanceof ctor) as T | undefined;
  }

  getAllCapabilities<T extends WorkspaceCapability>(
    ctor: new (...args: unknown[]) => T,
  ): Array<{ moduleId: string; capability: T }> {
    const results: Array<{ moduleId: string; capability: T }> = [];
    for (const mod of this.modules.values()) {
      for (const cap of mod.capabilities) {
        if (cap instanceof ctor) {
          results.push({ moduleId: mod.metadata.id, capability: cap as T });
        }
      }
    }
    return results;
  }

  // Route lookup: find which module handles a path
  findModuleByPath(path: string): WorkspaceModule | undefined {
    for (const mod of this.modules.values()) {
      const routeCap = mod.capabilities.find((c) => c.kind === "route") as
        | RouteCapability
        | undefined;
      if (routeCap?.routes.some((r) => path.startsWith(r.path))) {
        return mod;
      }
    }
    return undefined;
  }
}

let instance: ModuleRegistryImpl | null = null;

export function getModuleRegistry(): ModuleRegistryImpl {
  if (!instance) {
    instance = new ModuleRegistryImpl();
  }
  return instance;
}

export type { ModuleRegistryImpl };
