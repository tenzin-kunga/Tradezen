import type {
  WorkspaceResource,
  ContextSlice,
  ContextContributor,
} from "./types";
import { getModuleRegistry } from "./module-registry";

const TOTAL_BUDGET = 2000; // total token budget for all context

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

    // Sort by priority (lower = more important)
    contributors.sort((a, b) => a.priority - b.priority);

    // Budget-aware context assembly
    const slices: ContextSlice[] = [];
    let remainingBudget = TOTAL_BUDGET;

    for (const contributor of contributors) {
      if (remainingBudget <= 0) break;

      const estimated = contributor.estimateTokens(resource);
      if (estimated > remainingBudget && estimated > contributor.budget) {
        // Skip if estimated tokens exceed both remaining budget and contributor's own budget
        continue;
      }

      try {
        const slice = await contributor.getContext(resource);
        const actualTokens = Math.min(slice.tokens, remainingBudget);
        slices.push({ ...slice, tokens: actualTokens });
        remainingBudget -= actualTokens;
      } catch (err) {
        console.error("[ContextEngine] Error from contributor:", err);
      }
    }

    this.cache.set(cacheKey, slices);

    // Clear cache after 30 seconds
    setTimeout(() => this.cache.delete(cacheKey), 30000);

    return slices;
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
