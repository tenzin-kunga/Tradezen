import type {
  WorkspaceResource,
  ContextSlice,
  ContextContributor,
} from "@/lib/workspace/types";

export const JournalContextContributor: ContextContributor = {
  priority: 10,
  budget: 500,
  estimateTokens(_resource) {
    return 200;
  },
  async getContext(resource: WorkspaceResource): Promise<ContextSlice> {
    const date =
      (resource.metadata?.date as string) ||
      new Date().toISOString().slice(0, 10);

    try {
      const { getJournalByDate, getTrades } = await import("@/lib/api");
      const [journal, tradesRes] = await Promise.all([
        getJournalByDate(date).catch(() => null),
        getTrades({ from: date, to: date, limit: 50 }).catch(() => null),
      ]);

      const trades = tradesRes?.data ?? [];
      const totalPnl = trades.reduce(
        (s: number, t: any) => s + (t.pnl ?? 0),
        0,
      );

      return {
        source: "journal",
        data: {
          date,
          mood: journal?.mood ?? null,
          tradeCount: trades.length,
          totalPnl: totalPnl ? totalPnl.toFixed(2) : null,
          preMarketPreview: journal?.pre_market_notes
            ? journal.pre_market_notes.slice(0, 200)
            : null,
          lessonsPreview: journal?.lessons
            ? journal.lessons.slice(0, 200)
            : null,
        },
        tokens: 150,
      };
    } catch {
      return {
        source: "journal",
        data: { date, error: "failed_to_load" },
        tokens: 20,
      };
    }
  },
};
