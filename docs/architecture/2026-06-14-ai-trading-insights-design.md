# Feature 3: AI Trading Insights

**Date:** 2026-06-14
**Status:** Draft
**Version:** 1.0

---

> **Implementation note (2026-07-08):** The engine described here shipped and was restructured in Phase 12 into a rule-registry architecture under `apps/api/src/ai/insights/`. The deterministic rules in "Widget 2" (session gap, trend alignment, avg RR, streak, discipline) still apply and now live in `rules/{performance,risk,discipline,consistency}.rules.ts`. Phase 12 added portfolio-aware rules (concentration risk, strategy over-reliance, losing-symbol by expectancy, directional imbalance by expectancy) — all mapped to the same four coaching categories (`performance`/`discipline`/`risk`/`consistency`); "portfolio" is a data source, never a category. An LLM narrative layer was added and is rendered as the "Portfolio Summary" block in `AiCoachWidget`. See `semantic-architecture-v1.md` → _Insight Engine_ for the current structure.

## Overview

Replace the current basic `AnalyticsPreviewWidget` with two separate dashboard widgets:

1. **Analytics Insights** — 4-category deterministic computed metrics (Performance, Discipline, Risk, Consistency), always visible, no AI.
2. **AI Coach** — Separate card with 1–3 cached natural-language insights generated from existing analytics, explaining visible metrics rather than inventing claims.

---

## Widget 1: Analytics Insights

### Layout

One `WidgetShell` with the title **ANALYTICS INSIGHTS** and a `View Full Analytics →` link in the header that navigates to `/analytics`.

Inside: 4 category groups displayed as a vertical stack. All four visible by default. No collapsible sections on desktop. On mobile width breakpoints, collapse automatically to save vertical space.

### Category 1: Performance

| Metric        | Source                               | Notes                           |
| ------------- | ------------------------------------ | ------------------------------- |
| Best Strategy | `/trades/analytics` → `bestStrategy` | Show name + `N trades • X% WR`  |
| Best Session  | `/trades/analytics` → `bestSession`  | Show name + `N trades • PF X.X` |
| Profit Factor | `/trades/analytics` → `profitFactor` | Show value, `∞` for infinite    |
| Expectancy    | `/trades/analytics` → `expectancy`   | Show `+$X.XX/trade`             |

### Category 2: Discipline

| Metric               | Source                                                                                                     | Notes                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| FOMO Trades          | `/trades/analytics/behavioral` → `fomo.fomoScore`                                                          | Show `X%`                                                        |
| Vengeance Trades     | `/trades/analytics/behavioral` → `revenge.revengeScore`                                                    | Show `X%`                                                        |
| Trend-Aligned Trades | computed from trades (dashboard data)                                                                      | `trendAlignedCount / totalTrades`, show `X%`                     |
| Most Common Mistake  | `/trades/analytics/behavioral` → derive from max(fomo.fomoScore, revenge.revengeScore, scores.lossChasing) | Show label: "FOMO Entries", "Revenge Trading", or "Loss Chasing" |

### Category 3: Risk

| Metric                    | Source                        | Notes                       |
| ------------------------- | ----------------------------- | --------------------------- |
| Average RR                | `/trades/analytics` → `avgRR` | Show `X.X`                  |
| Largest Loss              | computed from trades          | Show `-$X`                  |
| Largest Win               | computed from trades          | Show `+$X`                  |
| Position Size Consistency | computed from trades          | Show Good/Fair/Inconsistent |

### Category 4: Consistency

| Metric          | Source                                                    | Notes                      |
| --------------- | --------------------------------------------------------- | -------------------------- |
| Current Streak  | `/trades/analytics/advanced` → `currentStreak`            | Show `X Wins` / `X Losses` |
| Best Week       | computed from `/trades/analytics` → `byMonth`             | Show `+$X` for best month  |
| Best Day        | `/trades/dashboard` → insights `bestDay`                  | Show day name              |
| Trade Frequency | `/trades/analytics` → `totalTrades / daysSinceFirstTrade` | Show `X.X/day`             |

### Sample Size Rule

Every metric that references a subset of trades MUST display the sample count:

- `34 trades • 68% WR`
- `52 trades • PF 1.9`
- `12 trades • +$14.20 avg`

If sample count < 5, append a `• small sample` badge with muted styling. Metrics with zero trades display `--` rather than `0`.

### Mobile Collapse Behavior

At the `sm` breakpoint (≤ 640px), categories collapse into accordion sections with a chevron toggle. Only the first category (Performance) is expanded by default. At `md+` (≥ 768px), all four categories are visible as a vertical stack with headers but no collapse mechanism.

### Position Size Consistency Algorithm

Compute the coefficient of variation (CV) = stdDev(lotSizes) / mean(lotSizes):

- CV < 0.3 → "Good"
- CV < 0.6 → "Fair"
- CV ≥ 0.6 → "Inconsistent"

### Empty/No-Data State

If `totalTrades` is 0, show the existing `EmptyState` with CTA to log the first trade. If 1–4 trades exist, show metrics with available data and `• small sample` badges on all of them.

---

## Widget 2: AI Coach

### Layout

One `WidgetShell` with the title **AI COACH** below the Analytics Insights card. No link in header.

**Contents:** 1–3 insight cards, each containing:

- A category tag (Performance / Discipline / Risk / Consistency)
- A natural-language insight sentence that traces to visible dashboard metrics
- Optional secondary stats shown inline

**Examples of valid insights:**

> Your London session trades have a 68% win rate versus 47% in New York. (reference: Performance → Best Session)
>
> Trend-aligned trades show a 73% win rate compared to 41% for non-aligned trades. (reference: Discipline → Trend Alignment)
>
> Your average RR of 0.8 is below the 1.5 threshold. Improving reward targets could increase profitability. (reference: Risk → Avg RR)

**Examples of invalid insights (must NOT generate):**

> You seem emotionally reactive during volatile conditions. (no traceable metric)

### Data Source

- `GET /ai/coaching` — existing `CoachingEngineService.getCoachingHistory(userId, limit=3)`
- Or a new dedicated `/ai/insights` endpoint that generates structured insight objects from analytics snapshots
- Cached in the `ai_insights` table, refreshed periodically (every 6 hours or on manual refresh)

### Graceful Fallback

If no insights are available (fresh account, coaching engine disabled, API error):

> AI Coach is warming up. Insights will appear after more trading data is collected.

No loading spinner on dashboard mount. Insights are fetched once and cached.

### Refresh (V2)

Add a refresh icon in the WidgetShell header to regenerate insights on demand. Not part of this phase.

---

## New Backend Endpoint

### `GET /ai/insights`

Returns structured insights:

```json
{
  "insights": [
    {
      "id": "uuid",
      "category": "performance",
      "title": "Session Performance",
      "message": "Your London session trades have a 68% win rate versus 47% in New York.",
      "metrics": { "londonWR": 68, "nyWR": 47, "londonTrades": 52 },
      "createdAt": "2026-06-14T..."
    }
  ],
  "generatedAt": "2026-06-14T..."
}
```

Insight generation logic:

1. Fetch analytics from `/trades/analytics`, `/analytics/advanced`, `/analytics/behavioral`
2. Apply rule-based templates (no LLM required):
   - Compare session WRs → if gap > 15%, generate session insight
   - Compare trend-aligned vs non-aligned WR → if gap > 20%, generate trend insight
   - Check avg RR vs 1.5 threshold → if below, generate risk insight
   - Check current streak length → if > 5, generate streak insight
   - Check discipline scores → if FOMO > 20% or vengeance > 10%, generate discipline insight
3. Pick top 3 by priority (Risk > Discipline > Performance > Consistency)
4. Cache results in `ai_insights` with a `generated_at` timestamp
5. Serve cached results, only regenerate if cache is older than 6 hours

---

## Frontend Changes

### New Files

| File                                     | Purpose                             |
| ---------------------------------------- | ----------------------------------- |
| `components/AnalyticsInsightsWidget.tsx` | 4-category computed insights card   |
| `components/AiCoachWidget.tsx`           | AI Coach insight cards              |
| `hooks/useAiInsights.ts`                 | Fetch + cache state for AI insights |
| `lib/api.ts` additions                   | `getAiInsights()` function          |

### Changed Files

| File                  | Change                                                                               |
| --------------------- | ------------------------------------------------------------------------------------ |
| `app/page.tsx`        | Swap `AnalyticsPreviewWidget` → `AnalyticsInsightsWidget`, add `AiCoachWidget` below |
| `lib/layout-types.ts` | Update `WidgetId` to include `"analytics-insights"` and `"ai-coach"`                 |
| `lib/api.ts`          | Add `getAiInsights()`                                                                |

### Deleted Files

| File                                    | Reason                                |
| --------------------------------------- | ------------------------------------- |
| `components/AnalyticsPreviewWidget.tsx` | Replaced by `AnalyticsInsightsWidget` |

### Layout Migration

The old `"analytics-preview"` widget ID in the `dashboard_layout` column is replaced by two new IDs: `"analytics-insights"` and `"ai-coach"`. On first load after deploy, users who had `analytics-preview` visible get both new widgets appended at that position. If `analytics-preview` was hidden, the new widgets default to visible. Migration runs as a one-time check in `useDashboardLayout` on mount — if no `layout_migrated_v2` flag in localStorage, detect old ID and replace it.

---

## API Data Flow

```
Dashboard mount
  ├── useDashboardLayout → read layout from localStorage then API
  ├── useDashboardData → GET /trades/dashboard (existing)
  ├── useAnalytics → GET /trades/analytics (existing)
  ├── useBehavioral → GET /trades/analytics/behavioral (existing)
  └── useAiInsights → GET /ai/insights (new, 6h cache, no spinner)
```

`AnalyticsInsightsWidget` receives data from the analytics and behavioral queries. `AiCoachWidget` receives data from the insights cache.

---

## Success Criteria

- [ ] Analytics Insights widget shows 4 categories with all metrics visible by default
- [ ] Every metric with a subset has sample size displayed
- [ ] `View Full Analytics →` links to `/analytics`
- [ ] AI Coach shows 1–3 explainable insights traceable to dashboard metrics
- [ ] AI insights are rule-generated (no LLM dependency), cached, with 6-hour TTL
- [ ] Graceful empty state for both widgets with low data
- [ ] No loading spinners on dashboard mount for AI Coach
- [ ] Old `AnalyticsPreviewWidget` removed
- [ ] `WidgetId` type updated, layout defaults include both new widget IDs
- [ ] Type-check passes (api + web)
