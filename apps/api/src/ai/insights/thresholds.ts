// Centralized tuning constants for the insight engine.
// AI/coaching tuning almost always ends up adjusting thresholds; keep them here.

export const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export const MIN_TOTAL_TRADES = 5;

// Portfolio rules
export const CONCENTRATION_PCT = 40; // top symbol allocation share
export const MIN_SYMBOL_TRADES = 5;
export const STRATEGY_DOMINANCE_PCT = 50; // top strategy trade share
export const MIN_STRATEGY_TRADES = 10;
export const MIN_DIRECTION_TRADES = 10;

// Existing rule thresholds
export const REWARD_RISK_THRESHOLD = 1.5;
export const FOMO_RATE_THRESHOLD = 0.2; // 20%
export const VENGEANCE_RATE_THRESHOLD = 0.1; // 10%
export const TREND_ALIGNED_MIN = 5;
export const WIN_STREAK_MIN = 5;
export const LOSS_STREAK_MIN = 4;
export const SESSION_GAP_WR = 15; // win-rate gap % between best/worst session

export const MAX_INSIGHTS = 3;
export const MAX_RISK_CARDS = 2; // risk may surface twice; other categories once

// Proactive coaching delivery
export const COACHING_DEDUPE_MS = 24 * 60 * 60 * 1000; // one push per rule per day

export const COACHING_SEVERITY_BY_CATEGORY: Record<string, string> = {
  risk: 'high',
  discipline: 'medium',
  consistency: 'medium',
  performance: 'low',
};
