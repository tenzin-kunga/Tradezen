import type { InsightContext } from './insight-context';

export type InsightCategory =
  | 'performance'
  | 'discipline'
  | 'risk'
  | 'consistency';

// Where the rule gets its data from. `portfolio` rules extend the analytics
// engine with directional/expectancy-aware portfolio intelligence; `analytics`
// rules surface existing behavioral/performance signals.
export type InsightSourceId = 'portfolio' | 'analytics';

export interface InsightCard {
  id: string;
  ruleId: string; // stable identifier, e.g. `portfolio.concentration:AAPL`
  category: InsightCategory;
  title: string;
  message: string;
  metrics: Record<string, unknown>;
  pushable: boolean; // may it trigger a proactive coaching notification?
  source: InsightSourceId;
  createdAt: string;
}

export interface InsightCandidate {
  card: InsightCard;
  priority: number; // lower number = higher priority (runtime only)
}

export interface InsightSource {
  generate(ctx: InsightContext): InsightCandidate[];
}
