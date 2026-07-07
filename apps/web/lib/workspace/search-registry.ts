import type { SearchProvider, SearchResult, QuickAction, WorkspaceResource } from "./types";

class SearchRegistryImpl {
  private providers = new Map<string, SearchProvider>();

  register(id: string, provider: SearchProvider): void {
    this.providers.set(id, provider);
  }

  unregister(id: string): void {
    this.providers.delete(id);
  }

  async search(query: string): Promise<SearchResult[]> {
    const results = await Promise.all(
      Array.from(this.providers.values()).map((p) => p.search(query)),
    );
    return results.flat();
  }

  async recent(): Promise<SearchResult[]> {
    const results = await Promise.all(
      Array.from(this.providers.values()).map((p) => p.recent()),
    );
    return results.flat();
  }

  async favorites(): Promise<SearchResult[]> {
    const results = await Promise.all(
      Array.from(this.providers.values()).map((p) => p.favorites()),
    );
    return results.flat();
  }

  async related(resource: WorkspaceResource): Promise<SearchResult[]> {
    const results = await Promise.all(
      Array.from(this.providers.values()).map((p) => p.related(resource)),
    );
    return results.flat();
  }

  quickActions(): QuickAction[] {
    const actions: QuickAction[] = [];
    for (const provider of this.providers.values()) {
      actions.push(...provider.quickActions());
    }
    return actions;
  }
}

let instance: SearchRegistryImpl | null = null;

export function getSearchRegistry(): SearchRegistryImpl {
  if (!instance) {
    instance = new SearchRegistryImpl();
  }
  return instance;
}
