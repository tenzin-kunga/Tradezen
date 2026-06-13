"use client";

type StatCardProps = {
  title: string;
  value: string;
  trend?: { value: string; positive: boolean };
};

export default function StatCard({ title, value, trend }: StatCardProps) {
  return (
    <div
      style={{
        background: "var(--bg-surface, #111214)",
        border: "1px solid var(--border, #23252d)",
        borderRadius: 20,
        padding: "20px 24px",
        transition: "transform 0.2s ease, border-color 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "var(--border-hover, #2a2d36)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.borderColor = "var(--border, #23252d)";
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #9ca3af)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary, #fafafa)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {value}
      </div>
      {trend && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={trend.positive ? "#22c55e" : "#ef4444"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {trend.positive ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
          </svg>
          <span style={{ fontSize: 12, fontWeight: 500, color: trend.positive ? "#22c55e" : "#ef4444" }}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
