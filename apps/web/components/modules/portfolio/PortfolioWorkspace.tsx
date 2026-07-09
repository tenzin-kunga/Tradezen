"use client";

import { useEffect, useState } from "react";
import {
  getPortfolio,
  type Portfolio,
  type SymbolPosition,
} from "@/lib/api/portfolio";
import { EmptyState } from "@/components/primitives/EmptyState";
import { Skeleton } from "@/components/primitives/Skeleton";

function fmt(n: number, digits = 2): string {
  if (!isFinite(n)) return "∞";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function PortfolioWorkspace() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPortfolio()
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load portfolio"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={64} radius={10} />
          ))}
        </div>
        <Skeleton height={220} radius={10} />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="Couldn't load portfolio" description={error} />;
  }

  if (!data || data.summary.totalTrades === 0) {
    return (
      <EmptyState
        title="No trades yet"
        description="Portfolio analytics compute from your trade journal. Add trades to see your performance breakdown."
      />
    );
  }

  const { summary, symbols, strategies, byDirection } = data;

  return (
    <div
      className="tz-scroll"
      style={{ height: "100%", overflowY: "auto", padding: 20 }}
    >
      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <SummaryCard
          label="Realized P&L"
          value={fmt(summary.realizedPnl)}
          positive={summary.realizedPnl >= 0}
        />
        <SummaryCard label="Win Rate" value={`${fmt(summary.winRate, 1)}%`} />
        <SummaryCard
          label="Profit Factor"
          value={fmt(summary.profitFactor, 2)}
        />
        <SummaryCard label="Trades" value={String(summary.totalTrades)} />
        <SummaryCard label="Avg Win" value={fmt(summary.avgWin)} positive />
        <SummaryCard label="Avg Loss" value={fmt(summary.avgLoss)} negative />
        <SummaryCard label="Best" value={fmt(summary.bestTrade)} positive />
        <SummaryCard label="Worst" value={fmt(summary.worstTrade)} negative />
      </div>

      {/* Direction + behavioral */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginBottom: 20,
          fontSize: 12,
          color: "var(--text-dim, #6b7280)",
        }}
      >
        <span>
          Longs:{" "}
          <b style={{ color: "var(--text-primary, #fafafa)" }}>
            {byDirection.long}
          </b>
        </span>
        <span>
          Shorts:{" "}
          <b style={{ color: "var(--text-primary, #fafafa)" }}>
            {byDirection.short}
          </b>
        </span>
        <span>
          FOMO trades:{" "}
          <b style={{ color: "var(--accent-loss, #ef4444)" }}>
            {summary.fomoTrades}
          </b>
        </span>
        <span>
          Revenge trades:{" "}
          <b style={{ color: "var(--accent-loss, #ef4444)" }}>
            {summary.vengeanceTrades}
          </b>
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Symbol positions */}
        <div
          className="glass-card"
          style={{ borderRadius: 10, overflow: "hidden" }}
        >
          <div style={sectionHeader}>POSITIONS BY SYMBOL</div>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr
                style={{
                  color: "var(--text-dim, #6b7280)",
                  textAlign: "right",
                }}
              >
                <th style={thStyle}>Symbol</th>
                <th style={thStyle}>Trades</th>
                <th style={thStyle}>Win%</th>
                <th style={thStyle}>Realized</th>
                <th style={thStyle}>Avg</th>
                <th style={{ ...thStyle, width: 120, textAlign: "left" }}>
                  Allocation
                </th>
              </tr>
            </thead>
            <tbody>
              {symbols.map((s) => (
                <SymbolRow key={s.symbol} s={s} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Strategy attribution */}
        <div
          className="glass-card"
          style={{ borderRadius: 10, overflow: "hidden" }}
        >
          <div style={sectionHeader}>BY STRATEGY</div>
          {strategies.map((st) => (
            <div
              key={st.strategy}
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--border, #23252d)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary, #fafafa)",
                  }}
                >
                  {st.strategy}
                </div>
                <div
                  style={{ fontSize: 11, color: "var(--text-muted, #9ca3af)" }}
                >
                  {st.trades} trades · {fmt(st.winRate, 1)}%
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color:
                    st.realizedPnl >= 0
                      ? "var(--accent-profit, #22c55e)"
                      : "var(--accent-loss, #ef4444)",
                }}
              >
                {fmt(st.realizedPnl)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SymbolRow({ s }: { s: SymbolPosition }) {
  return (
    <tr
      style={{
        borderTop: "1px solid var(--border, #23252d)",
        textAlign: "right",
        color: "var(--text-primary, #fafafa)",
      }}
    >
      <td style={{ ...tdStyle, textAlign: "left", fontWeight: 600 }}>
        {s.symbol}
      </td>
      <td style={tdStyle}>{s.trades}</td>
      <td style={tdStyle}>{fmt(s.winRate, 1)}%</td>
      <td
        style={{
          ...tdStyle,
          color:
            s.realizedPnl >= 0
              ? "var(--accent-profit, #22c55e)"
              : "var(--accent-loss, #ef4444)",
        }}
      >
        {fmt(s.realizedPnl)}
      </td>
      <td style={tdStyle}>{fmt(s.avgPnl)}</td>
      <td style={{ ...tdStyle, textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              background: "var(--bg-surface-hover, #1a1b23)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, s.allocationPct)}%`,
                height: "100%",
                background: "var(--accent, #3b82f6)",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted, #9ca3af)",
              width: 34,
              textAlign: "right",
            }}
          >
            {fmt(s.allocationPct, 1)}%
          </span>
        </div>
      </td>
    </tr>
  );
}

function SummaryCard({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  const color = positive
    ? "var(--accent-profit, #22c55e)"
    : negative
      ? "var(--accent-loss, #ef4444)"
      : "var(--text-primary, #fafafa)";
  return (
    <div
      className="glass-card"
      style={{ padding: "12px 14px", borderRadius: 10 }}
    >
      <div
        style={{
          fontSize: 10,
          color: "var(--text-dim, #6b7280)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

const sectionHeader: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-dim, #6b7280)",
  letterSpacing: "0.05em",
  borderBottom: "1px solid var(--border, #23252d)",
};

const thStyle: React.CSSProperties = {
  padding: "8px 14px",
  fontWeight: 500,
  fontSize: 11,
};
const tdStyle: React.CSSProperties = { padding: "8px 14px" };
