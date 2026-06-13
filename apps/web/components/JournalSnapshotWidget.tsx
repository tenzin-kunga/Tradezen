"use client";

import Link from "next/link";

type Entry = {
  id: string;
  date: string;
  mood?: string;
  market_conditions?: string;
  lesson?: string;
  notes?: string;
} | null;

type Props = { entry: Entry; loading?: boolean };

const moodEmoji: Record<string, string> = {
  focused: "😌",
  confident: "💪",
  anxious: "😰",
  tired: "😴",
  frustrated: "😤",
  neutral: "😐",
};

export default function JournalSnapshotWidget({ entry, loading }: Props) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 20, width: 140, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 14, width: "80%", background: "var(--bg-surface-hover)", borderRadius: 6, marginBottom: 8 }} />
        <div style={{ height: 14, width: "60%", background: "var(--bg-surface-hover)", borderRadius: 6 }} />
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span className="label-caps">LATEST JOURNAL</span>
        <Link href="/journal" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
          View All →
        </Link>
      </div>
      {entry ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entry.mood && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <span>{moodEmoji[entry.mood.toLowerCase()] || "📝"}</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{entry.mood}</span>
            </div>
          )}
          {entry.market_conditions && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <span>📈</span>
              <span>{entry.market_conditions}</span>
            </div>
          )}
          {entry.lesson && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
              <span>💡</span>
              <span style={{ lineHeight: 1.4 }}>{entry.lesson}</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 12 }}>No journal entries yet. Start building the habit.</p>
          <Link href="/journal" className="btn-glass" style={{ display: "inline-block", padding: "6px 16px", fontSize: 12, textDecoration: "none" }}>
            Write Entry
          </Link>
        </div>
      )}
    </div>
  );
}
