"use client";

import { WidgetShell } from "@/components/design-system";

type Props = {
  tradesToday: number;
  winRateToday: number;
  pnlToday: number;
  openRisk: number;
  loading?: boolean;
};

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-base font-semibold" style={{ color: color || "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function DailySummaryCard({ tradesToday, winRateToday, pnlToday, openRisk, loading }: Props) {
  const hasData = tradesToday > 0;

  return (
    <WidgetShell title="TODAY'S TRADING" loading={loading} isEmpty={!hasData} emptyMessage="No trading activity today.">
      <div className="flex flex-col gap-3">
        <Row label="Trades Taken" value={String(tradesToday)} />
        <Row label="Win Rate" value={`${winRateToday}%`} />
        <Row label="Current P&L" value={`${pnlToday >= 0 ? "+" : ""}$${Math.abs(pnlToday).toLocaleString()}`} color={pnlToday >= 0 ? "var(--accent-profit)" : "var(--accent-loss)"} />
        <Row label="Open Risk" value={`$${openRisk.toLocaleString()}`} color="var(--accent-warn)" />
      </div>
    </WidgetShell>
  );
}
