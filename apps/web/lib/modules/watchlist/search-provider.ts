import type {
  SearchProvider,
  SearchResult,
  QuickAction,
  WorkspaceResource,
} from "@/lib/workspace/types";
import { createWatchlistResource } from "@/lib/workspace/resource";

const STORAGE_KEY = "tradezen_search_watchlist_recents";

function getRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function createWatchlistSearchProvider(): SearchProvider {
  return {
    async search(query: string): Promise<SearchResult[]> {
      if (query.length < 1) return [];

      try {
        const { searchSymbols } = await import("@/lib/api/watchlist");
        const symbols = await searchSymbols(query);

        return symbols.map((s) => ({
          resource: createWatchlistResource(),
          score: 0.8,
          highlights: [s.ticker, s.name].filter(Boolean) as string[],
          actions: [],
        }));
      } catch {
        return [];
      }
    },

    async recent(): Promise<SearchResult[]> {
      const recents = getRecents();
      return recents.map((query) => ({
        resource: createWatchlistResource(),
        score: 0.5,
        highlights: [query],
        actions: [],
      }));
    },

    async favorites(): Promise<SearchResult[]> {
      return [];
    },

    async related(_resource: WorkspaceResource): Promise<SearchResult[]> {
      return [];
    },

    quickActions(): QuickAction[] {
      return [
        {
          id: "watchlist-add",
          label: "Add to Watchlist",
          action: () => {},
        },
      ];
    },
  };
}
