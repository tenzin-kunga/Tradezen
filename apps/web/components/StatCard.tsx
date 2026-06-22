"use client";

type StatCardProps = {
  title: string;
  value: string;
  trend?: { value: string; positive: boolean };
};

export default function StatCard({ title, value, trend }: StatCardProps) {
  return (
    <div className="glass-card-interactive rounded-xl p-5 flex flex-col gap-1">
      <div className="label-caps">{title}</div>
      <div className="text-3xl font-bold text-text-primary tracking-tight leading-tight">{value}</div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={trend.positive ? "var(--accent-profit)" : "var(--accent-loss)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {trend.positive ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
          </svg>
          <span className={`text-xs font-medium ${trend.positive ? "text-profit" : "text-loss"}`}>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
