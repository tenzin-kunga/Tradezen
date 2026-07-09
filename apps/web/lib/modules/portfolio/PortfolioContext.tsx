import type {
  WorkspaceResource,
  ContextSlice,
  ContextContributor,
} from "@/lib/workspace/types";

export const PortfolioContextContributor: ContextContributor = {
  priority: 6,
  budget: 300,
  estimateTokens(_resource) {
    return 150;
  },
  async getContext(_resource: WorkspaceResource): Promise<ContextSlice> {
    try {
      const { getPortfolio } = await import("@/lib/api/portfolio");
      const portfolio = await getPortfolio();
      const { summary, symbols } = portfolio;

      return {
        source: "portfolio",
        data: {
          totalTrades: summary.totalTrades,
          winRate: summary.winRate
            ? `${(summary.winRate * 100).toFixed(1)}%`
            : null,
          realizedPnl: summary.realizedPnl?.toFixed(2) ?? null,
          profitFactor: summary.profitFactor?.toFixed(2) ?? null,
          topSymbols: symbols.slice(0, 5).map((s) => ({
            symbol: s.symbol,
            pnl: s.realizedPnl?.toFixed(2),
            trades: s.trades,
          })),
        },
        tokens: 120,
      };
    } catch {
      return {
        source: "portfolio",
        data: { error: "failed_to_load" },
        tokens: 10,
      };
    }
  },
};
