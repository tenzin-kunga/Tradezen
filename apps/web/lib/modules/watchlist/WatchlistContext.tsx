import type {
  WorkspaceResource,
  ContextSlice,
  ContextContributor,
} from "@/lib/workspace/types";

export const WatchlistContextContributor: ContextContributor = {
  priority: 8,
  budget: 300,
  estimateTokens(_resource) {
    return 120;
  },
  async getContext(resource: WorkspaceResource): Promise<ContextSlice> {
    try {
      const { getWatchlists, getWatchlistItems } =
        await import("@/lib/api/watchlist");
      const lists = await getWatchlists();
      const activeId = (resource.metadata?.listId as string) || lists[0]?.id;

      if (!activeId) {
        return {
          source: "watchlist",
          data: { listCount: lists.length },
          tokens: 20,
        };
      }

      const items = await getWatchlistItems(activeId);
      const activeList = lists.find((l) => l.id === activeId);

      return {
        source: "watchlist",
        data: {
          listCount: lists.length,
          activeListName: activeList?.name ?? "Default",
          symbolCount: items.length,
          symbols: items
            .slice(0, 10)
            .map((i) => i.ticker)
            .filter(Boolean),
          hasAlerts: items.some(
            (i) => i.alerts && Object.keys(i.alerts).length > 0,
          ),
        },
        tokens: 80,
      };
    } catch {
      return {
        source: "watchlist",
        data: { error: "failed_to_load" },
        tokens: 10,
      };
    }
  },
};
