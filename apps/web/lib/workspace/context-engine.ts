import type {
  WorkspaceResource,
  ContextSlice,
  ContextContributor,
} from "./types";
import { getModuleRegistry } from "./module-registry";

class ContextEngineImpl {
  private cache = new Map<string, ContextSlice[]>();

  async getContext(resource: WorkspaceResource): Promise<ContextSlice[]> {
    const cacheKey = `${resource.type}:${resource.id}`;

    // Simple in-memory cache (invalidate on context.changed events)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const registry = getModuleRegistry();
    const contributors = registry
      .getAll()
      .map((mod) => {
        const cap = mod.capabilities.find(
          (c) => c.constructor.name === "ContextCapability",
        ) as { contributor: ContextContributor } | undefined;
        return cap?.contributor;
      })
      .filter(Boolean) as ContextContributor[];

    const slices = await Promise.all(
      contributors.map((c) =>
        c.getContext(resource).catch((err) => {
          console.error(
            `[ContextEngine] Error from contributor:`,
            err,
          );
          return null;
        }),
      ),
    );

    const result = slices.filter(Boolean) as ContextSlice[];
    this.cache.set(cacheKey, result);

    // Clear cache after 30 seconds
    setTimeout(() => this.cache.delete(cacheKey), 30000);

    return result;
  }

  invalidate(resource?: WorkspaceResource): void {
    if (resource) {
      this.cache.delete(`${resource.type}:${resource.id}`);
    } else {
      this.cache.clear();
    }
  }
}

let instance: ContextEngineImpl | null = null;

export function getContextEngine(): ContextEngineImpl {
  if (!instance) {
    instance = new ContextEngineImpl();
  }
  return instance;
}
