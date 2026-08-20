"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function formatCurrency(v: number) {
  const sign = v >= 0 ? "+" : "";
  return `${sign}$${v.toFixed(0)}`;
}

export default function RiskDistributionChart({
  data,
}: {
  data: { bucket: string; count: number; totalPnl: number }[];
}) {
  if (data.length === 0) return null;

  const isNegBucket = (b: string) => b.startsWith("<") || b.startsWith("-");

  const loserBuckets = data.filter((b) => isNegBucket(b.bucket));
  const winnerBuckets = data.filter((b) => !isNegBucket(b.bucket));
  const loserCount = loserBuckets.reduce((s, b) => s + b.count, 0);
  const winnerCount = winnerBuckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="surface-1 rounded-xl p-4">
      <h3 className="text-xs font-semibold tracking-widest text-[var(--text-muted)] uppercase mb-3">
        R-MULTIPLE DISTRIBUTION
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
            />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              axisLine={{ stroke: "var(--border-subtle)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={{ stroke: "var(--border-subtle)" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                fontSize: 12,
              }}
              cursor={{ fill: "transparent" }}
              formatter={(value: number) => [`${value} trades`, "Count"]}
              labelFormatter={(label) => `R-Multiple: ${label}`}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    isNegBucket(entry.bucket)
                      ? "var(--accent-loss)"
                      : entry.bucket === "0R to 1R"
                        ? "var(--accent-warn)"
                        : "var(--accent-profit)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3">
        {loserCount > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--accent-loss)]">
              {loserCount}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">LOSERS</div>
          </div>
        )}
        {winnerCount > 0 && (
          <div className="text-center">
            <div className="text-lg font-bold text-[var(--accent-profit)]">
              {winnerCount}
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">WINNERS</div>
          </div>
        )}
        {data.length > 0 && (
          <>
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--text-primary)]">
                {data.reduce((s, b) => s + b.count, 0)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">TOTAL</div>
            </div>
            <div className="text-center">
              <div
                className="text-lg font-bold"
                style={{ color: "var(--accent-profit)" }}
              >
                {formatCurrency(data.reduce((s, b) => s + b.totalPnl, 0))}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                TOTAL PNL
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
