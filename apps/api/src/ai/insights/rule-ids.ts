// Stable identifiers for every insight rule. Rules and tests reference these
// instead of scattering string literals, so ruleId is compile-time safe.
export const RULE_IDS = {
  RISK_AVG_RR: 'risk.avg-rr',
  RISK_ASYMMETRY: 'risk.asymmetry',
  PORTFOLIO_CONCENTRATION: 'portfolio.concentration',
  PORTFOLIO_STRATEGY_RELIANCE: 'portfolio.strategy-reliance',
  PORTFOLIO_LOSING_SYMBOL: 'portfolio.losing-symbol',
  PORTFOLIO_DIRECTIONAL: 'portfolio.directional',
  DISCIPLINE_FOMO: 'discipline.fomo',
  DISCIPLINE_REVENGE: 'discipline.revenge',
  DISCIPLINE_TREND: 'discipline.trend',
  CONSISTENCY_WINNING_STREAK: 'consistency.winning-streak',
  CONSISTENCY_LOSING_STREAK: 'consistency.losing-streak',
  PERFORMANCE_BEST_STRATEGY: 'performance.best-strategy',
  PERFORMANCE_SESSION: 'performance.session',
  PERFORMANCE_BEST_DAY: 'performance.best-day',
} as const;
