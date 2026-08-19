import type { InsightSource } from '../insight-source';
import { performanceRules } from './performance.rules';
import { riskRules } from './risk.rules';
import { disciplineRules } from './discipline.rules';
import { consistencyRules } from './consistency.rules';
import { portfolioRules } from './portfolio.rules';

// Rule registry. Adding a future intelligence source (journal, calendar,
// watchlist, research, macro) is additive: implement InsightSource and push
// it here — the orchestrator does not change.
export const RULES: InsightSource[] = [
  performanceRules,
  riskRules,
  disciplineRules,
  consistencyRules,
  portfolioRules,
];

export {
  performanceRules,
  riskRules,
  disciplineRules,
  consistencyRules,
  portfolioRules,
};
