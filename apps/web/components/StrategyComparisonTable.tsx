"use client";

interface StrategyRow {
  strategy: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgRr: number;
  maxDrawdown: number;
  totalPnl: number;
}

function fmt(val: number | null | undefined): string {
  if (val == null) return "--";
  if (val === Infinity) return "∞";
  return val.toFixed(2);
}

export default function StrategyComparisonTable({
  strategies,
  onSelect,
  bestStrategy,
  worstStrategy,
}: {
  strategies: StrategyRow[];
  onSelect: (strategy: string) => void;
  bestStrategy: string;
  worstStrategy: string;
}) {
  if (strategies.length < 1) return null;

  const maxVal = (field: keyof StrategyRow) =>
    Math.max(...strategies.map((s) => (typeof s[field] === "number" ? (s[field] as number) : 0)));
  const minVal = (field: keyof StrategyRow) =>
    Math.min(...strategies.map((s) => (typeof s[field] === "number" ? (s[field] as number) : 0)));

  const isBest = (s: StrategyRow, field: keyof StrategyRow) => {
    if (field === "maxDrawdown") return s[field] === minVal("maxDrawdown");
    return s[field] === maxVal(field);
  };
  const isWorst = (s: StrategyRow, field: keyof StrategyRow) => {
    if (field === "maxDrawdown") return s[field] === maxVal("maxDrawdown");
    return s[field] === minVal(field);
  };

  const cellStyle = (s: StrategyRow, field: keyof StrategyRow) => {
    if (isBest(s, field)) return { color: "var(--accent-profit)" as const, fontWeight: 600 as const };
    if (isWorst(s, field)) return { color: "var(--accent-loss)" as const };
    return { color: "var(--text-muted)" as const };
  };

  return (
    <div
      className="rounded p-4 md:p-5"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
        STRATEGY COMPARISON
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["STRATEGY", "TRADES", "WIN RATE", "PROFIT FACTOR", "EXPECTANCY", "AVG RR", "MAX DD", "TOTAL P&L"].map((h) => (
                <th
                  key={h}
                  className="tracking-widest py-2 pr-3 text-left whitespace-nowrap"
                  style={{ color: "var(--text-dim)", fontWeight: 400 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strategies.map((s) => (
              <tr
                key={s.strategy}
                onClick={() => onSelect(s.strategy)}
                style={{
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "background-color 0.15s",
                }}
                className="hover-row"
              >
                <td className="py-2.5 pr-3 font-bold tracking-wide whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                  #{s.strategy}
                  {s.strategy === bestStrategy && (
                    <span className="ml-1.5 text-[10px]" style={{ color: "var(--accent-profit)" }}>▲ BEST</span>
                  )}
                  {s.strategy === worstStrategy && (
                    <span className="ml-1.5 text-[10px]" style={{ color: "var(--accent-loss)" }}>▼ WORST</span>
                  )}
                </td>
                <td className="py-2.5 pr-3" style={{ color: "var(--text-muted)" }}>{s.totalTrades}</td>
                <td className="py-2.5 pr-3 font-mono" style={cellStyle(s, "winRate")}>{fmt(s.winRate)}%</td>
                <td className="py-2.5 pr-3 font-mono" style={cellStyle(s, "profitFactor")}>{fmt(s.profitFactor)}</td>
                <td className="py-2.5 pr-3 font-mono" style={cellStyle(s, "expectancy")}>
                  {s.expectancy >= 0 ? "+" : ""}${fmt(s.expectancy)}
                </td>
                <td className="py-2.5 pr-3 font-mono" style={cellStyle(s, "avgRr")}>{fmt(s.avgRr)}</td>
                <td className="py-2.5 pr-3 font-mono" style={cellStyle(s, "maxDrawdown")}>-${fmt(s.maxDrawdown)}</td>
                <td className="py-2.5 pr-3 font-mono" style={{ color: (s as any).totalPnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                  {(s as any).totalPnl >= 0 ? "+" : ""}${fmt((s as any).totalPnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .hover-row:hover { background-color: rgba(255,255,255,0.03); }
      `}</style>
    </div>
  );
}
