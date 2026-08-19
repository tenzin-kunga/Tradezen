import type { TradesService } from '../../trades/trades.service';
import type { BehavioralService } from '../../analytics/behavioral.service';
import type {
  PortfolioService,
  Portfolio,
} from '../../portfolio/portfolio.service';
import {
  computeDirectionalExpectancy,
  DirectionalExpectancy,
} from './portfolio-metrics';

export interface InsightContext {
  analytics: Awaited<ReturnType<TradesService['getAnalytics']>>;
  advanced: Awaited<ReturnType<TradesService['getAdvancedAnalytics']>>;
  behavior: Awaited<ReturnType<BehavioralService['analyzeBehavior']>>;
  portfolio: Portfolio;
  directionalExpectancy: DirectionalExpectancy;
}

interface ContextDeps {
  tradesService: TradesService;
  behavioralService: BehavioralService;
  portfolioService: PortfolioService;
}

export async function buildInsightContext(
  userId: string,
  deps: ContextDeps,
): Promise<InsightContext> {
  const [analytics, advanced, behavior, portfolio, directionalExpectancy] =
    await Promise.all([
      deps.tradesService.getAnalytics(userId),
      deps.tradesService.getAdvancedAnalytics(userId),
      deps.behavioralService.analyzeBehavior(userId),
      deps.portfolioService.getPortfolio(userId),
      computeDirectionalExpectancy(userId),
    ]);

  return { analytics, advanced, behavior, portfolio, directionalExpectancy };
}
