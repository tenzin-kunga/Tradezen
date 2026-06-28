# Dashboard UI Refinement

## Overview
Polish the dashboard hero, stat cards, and trading-consistency heatmap for better visual hierarchy and contrast. Daily Summary behavior is unchanged (empty state is correct when no trades exist today).

## Goals
- Remove the hand-wave emoji from the welcome hero for a cleaner, more professional tone.
- Refine the hero layout and spacing so the greeting and weekly stats feel balanced.
- Give the top stat cards (Total P&L, Win Rate, Profit Factor, Avg Risk:Reward) clear contrast against the page background.
- Make the Trading Consistency heatmap fill its card and reduce empty whitespace.

## Files Affected
- `apps/web/components/DashboardHero.tsx`
- `apps/web/components/StatCard.tsx`
- `apps/web/components/TradingHeatmap.tsx`
- `apps/web/app/globals.css` (optional new utility classes)

## Design Details

### 1. Dashboard Hero
- Greeting text: `Welcome back, {username || "Trader"}` — no emoji.
- Layout: greeting on the left/top, weekly stat chips on the right in a clean horizontal row.
- Background: keep the existing gradient but reduce visual clutter.
- Responsive: stats wrap on small screens.

### 2. Stat Cards
Each card gets a subtle tinted background and a top accent border to separate it from the dark page background:
- **Total P&L** — green tint (`rgba(34,197,94,0.08)`) when positive, red tint (`rgba(239,68,68,0.08)`) when negative; top border matches profit/loss color.
- **Win Rate** — blue tint (`rgba(59,130,246,0.08)`) with blue top border.
- **Profit Factor** — amber tint (`rgba(245,158,11,0.08)`) with amber top border.
- **Avg Risk:Reward** — cyan tint (`rgba(6,182,212,0.08)`) with cyan top border.
- Preserve existing `glass-card` hover lift.

### 3. Trading Consistency Heatmap
- Increase cell size from `w-3 h-3` to `w-4 h-4` (or fill-grid equivalent).
- Use a responsive grid that fills the card width instead of a small scrollable flex row.
- Reduce padding/margin around the heatmap so it uses the available vertical space.
- Keep the existing color legend but compact it.

## Out of Scope
- Daily Summary card (working as intended when no trades exist today).
- Layout drag-and-drop behavior.
- New widgets or data sources.

## Acceptance Criteria
- [ ] Hero displays without emoji and looks refined.
- [ ] Stat cards are visually distinct from the background in all themes.
- [ ] Heatmap cells are larger and fill the card width without excessive whitespace.
- [ ] No visual regressions on mobile or desktop.
