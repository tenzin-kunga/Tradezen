"use client";
import { useEffect, useState, useCallback } from "react";
import {
  createJournal,
  getJournals,
  getJournalByDate,
  updateJournal,
  deleteJournal,
  getJournalStreak,
} from "@/lib/api";

const moods = [
  { value: "great", label: "GREAT", emoji: "🟢", color: "#22c55e" },
  { value: "good", label: "GOOD", emoji: "🔵", color: "#3b82f6" },
  { value: "neutral", label: "NEUTRAL", emoji: "⚪", color: "#888" },
  { value: "bad", label: "BAD", emoji: "🟠", color: "#e8603c" },
  { value: "terrible", label: "TERRIBLE", emoji: "🔴", color: "#ef4444" },
];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function JournalPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, totalEntries: 0 });
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [preMarket, setPreMarket] = useState("");
  const [postMarket, setPostMarket] = useState("");
  const [mood, setMood] = useState("");
  const [marketConditions, setMarketConditions] = useState("");
  const [lessons, setLessons] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    try {
      const [journalRes, streakRes] = await Promise.all([getJournals(60), getJournalStreak()]);
      setEntries(journalRes.data);
      setStreak(streakRes);
    } catch {}
  }, []);

  const loadDateEntry = useCallback(async (date: string) => {
    try {
      const entry = await getJournalByDate(date);
      setCurrentEntry(entry);
      if (entry) {
        setPreMarket(entry.pre_market_notes || "");
        setPostMarket(entry.post_market_notes || "");
        setMood(entry.mood || "");
        setMarketConditions(entry.market_conditions || "");
        setLessons(entry.lessons || "");
      } else {
        setPreMarket(""); setPostMarket(""); setMood(""); setMarketConditions(""); setLessons("");
        setCurrentEntry(null);
      }
    } catch {
      setPreMarket(""); setPostMarket(""); setMood(""); setMarketConditions(""); setLessons("");
      setCurrentEntry(null);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadEntries(), loadDateEntry(selectedDate)]).finally(() => setLoading(false));
  }, [loadEntries, loadDateEntry, selectedDate]);

  async function handleSave() {
    setSaving(true);
    try {
      const data = {
        date: selectedDate,
        pre_market_notes: preMarket || undefined,
        post_market_notes: postMarket || undefined,
        mood: mood || undefined,
        market_conditions: marketConditions || undefined,
        lessons: lessons || undefined,
      };
      if (currentEntry?.id) {
        const updated = await updateJournal(currentEntry.id, data);
        setCurrentEntry(updated);
      } else {
        const created = await createJournal(data);
        setCurrentEntry(created);
      }
      await loadEntries();
    } catch {}
    setSaving(false);
  }

  async function handleDelete() {
    if (!currentEntry?.id) return;
    if (!confirm("Delete this journal entry?")) return;
    await deleteJournal(currentEntry.id);
    setCurrentEntry(null);
    setPreMarket(""); setPostMarket(""); setMood(""); setMarketConditions(""); setLessons("");
    await loadEntries();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        <div className="text-xs tracking-widest">LOADING JOURNAL...</div>
      </div>
    );
  }

  const entryDates = new Set(entries.map((e) => e.date?.slice(0, 10)));

  return (
    <div className="min-h-screen" style={{ color: "var(--text-primary)" }}>
      {/* Two-panel grid */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, maxWidth: 1100, margin: "0 auto", padding: "20px", alignItems: "start" }}>

        {/* ─── Side Panel ─── */}
        <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Streak */}
          <div className="rounded-xl px-3 py-3" style={{ background: "var(--bg-surface, #111214)", border: "1px solid var(--border, #23252d)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {[
                { label: "Current", value: `${streak.currentStreak}d`, color: streak.currentStreak >= 7 ? "var(--accent-profit)" : "var(--text-primary)" },
                { label: "Best", value: `${streak.longestStreak}d`, color: "var(--text-muted)" },
                { label: "Total", value: `${streak.totalEntries}`, color: "var(--text-muted)" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[9px] font-semibold tracking-wider mb-1" style={{ color: "var(--text-dim)" }}>{s.label}</div>
                  <div className="text-base font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Strip */}
          <div className="rounded-xl px-3 py-2.5" style={{ background: "var(--bg-surface, #111214)", border: "1px solid var(--border, #23252d)" }}>
            <div style={{ display: "flex", gap: 1, overflowX: "auto", scrollbarWidth: "thin" }}>
              {entries.slice(0, 21).map((e) => {
                const dateStr = e.date?.slice(0, 10);
                if (!dateStr) return null;
                const moodObj = moods.find((m) => m.value === e.mood);
                const isActive = dateStr === selectedDate;
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      padding: "5px 8px",
                      borderRadius: 6,
                      border: isActive ? "1px solid var(--accent-primary, #3b82f6)" : "1px solid transparent",
                      background: isActive ? "rgba(59,130,246,0.08)" : "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      flexShrink: 0,
                      minWidth: 42,
                      transition: "all 0.12s ease",
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{moodObj?.emoji || "⚪"}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, fontFamily: "var(--font-display)", color: isActive ? "var(--accent-primary)" : "var(--text-dim)" }}>
                      {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </button>
                );
              })}
            </div>
            {entries.length === 0 && (
              <div className="text-xs text-center py-3" style={{ color: "var(--text-dim)" }}>
                No entries yet — start writing today
              </div>
            )}
          </div>

          {/* Mood selector */}
          <div className="rounded-xl px-3 py-3" style={{ background: "var(--bg-surface, #111214)", border: "1px solid var(--border, #23252d)" }}>
            <div className="text-[9px] font-semibold tracking-widest mb-2" style={{ color: "var(--text-dim)" }}>MOOD</div>
            <div style={{ display: "flex", gap: 4 }}>
              {moods.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  style={{
                    flex: 1,
                    padding: "6px 2px",
                    borderRadius: 6,
                    border: mood === m.value ? `2px solid ${m.color}` : "1px solid var(--border, #23252d)",
                    background: mood === m.value ? `${m.color}18` : "transparent",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.12s ease",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 1 }}>{m.emoji}</div>
                  <div style={{ fontSize: 6, fontWeight: 700, letterSpacing: "0.3px", color: mood === m.value ? m.color : "var(--text-dim)" }}>
                    {m.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Entry history */}
          <div className="rounded-xl" style={{ background: "var(--bg-surface, #111214)", border: "1px solid var(--border, #23252d)", maxHeight: 260, overflowY: "auto" }}>
            <div className="px-3 pt-2.5 pb-1.5 text-[9px] font-semibold tracking-widest" style={{ color: "var(--text-dim)" }}>
              HISTORY
            </div>
            {entries.length === 0 ? (
              <div className="px-3 pb-3 text-xs" style={{ color: "var(--text-dim)" }}>No entries yet</div>
            ) : (
              entries.map((e) => {
                const dateStr = e.date?.slice(0, 10);
                if (!dateStr) return null;
                const moodObj = moods.find((m) => m.value === e.mood);
                const isActive = dateStr === selectedDate;
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "6px 12px",
                      border: "none",
                      borderLeft: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
                      background: isActive ? "rgba(59,130,246,0.06)" : "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{moodObj?.emoji || "⚪"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-display)" }}>
                        {new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Main Panel ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Header */}
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
              Trade Journal
            </h1>
            <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
              {fmtDate(selectedDate)}
              {entryDates.has(selectedDate) && (
                <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "var(--accent-profit)" }}>
                  ● Saved
                </span>
              )}
              {streak.currentStreak >= 3 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: "var(--accent-profit)" }}>
                  ⚡ {streak.currentStreak}-day streak
                </span>
              )}
            </p>
          </div>

          {/* Pre-market */}
          <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-surface, #111214)", border: "1px solid var(--border, #23252d)" }}>
            <div className="text-[10px] font-semibold tracking-wider mb-1.5" style={{ color: "var(--text-dim)" }}>PRE-MARKET NOTES</div>
            <textarea
              className="w-full min-h-[90px] resize-y text-sm outline-none box-border"
              value={preMarket}
              onChange={(e) => setPreMarket(e.target.value)}
              placeholder="Game plan for today — key levels, bias, setups to watch..."
              style={{
                background: "var(--bg-primary, #0a0b0e)",
                border: "1px solid var(--border, #23252d)",
                borderRadius: 8,
                padding: "8px 10px",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                fontSize: 12,
                resize: "vertical",
              }}
              />
            </div>

          {/* Post-market */}
          <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-surface, #111214)", border: "1px solid var(--border, #23252d)" }}>
            <div className="text-[10px] font-semibold tracking-wider mb-1.5" style={{ color: "var(--text-dim)" }}>POST-MARKET NOTES</div>
            <textarea
              className="w-full min-h-[90px] resize-y text-sm outline-none box-border"
              value={postMarket}
              onChange={(e) => setPostMarket(e.target.value)}
              placeholder="How did the session go? What went well, what needs improvement..."
              style={{
                background: "var(--bg-primary, #0a0b0e)",
                border: "1px solid var(--border, #23252d)",
                borderRadius: 8,
                padding: "8px 10px",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </div>

          {/* Market conditions + Lessons side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-surface, #111214)", border: "1px solid var(--border, #23252d)" }}>
              <div className="text-[10px] font-semibold tracking-wider mb-1.5" style={{ color: "var(--text-dim)" }}>MARKET CONDITIONS</div>
              <textarea
                className="w-full min-h-[60px] resize-y text-sm outline-none box-border"
                value={marketConditions}
                onChange={(e) => setMarketConditions(e.target.value)}
                placeholder="Trending, ranging, choppy, high volatility..."
                style={{
                  background: "var(--bg-primary, #0a0b0e)",
                  border: "1px solid var(--border, #23252d)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  resize: "vertical",
                }}
              />
            </div>
            <div className="rounded-xl px-4 py-3" style={{ background: "var(--bg-surface, #111214)", border: "1px solid var(--border, #23252d)" }}>
              <div className="text-[10px] font-semibold tracking-wider mb-1.5" style={{ color: "var(--text-dim)" }}>KEY LESSONS</div>
              <textarea
                className="w-full min-h-[60px] resize-y text-sm outline-none box-border"
                value={lessons}
                onChange={(e) => setLessons(e.target.value)}
                placeholder="What did you learn today? Rules to reinforce..."
                style={{
                  background: "var(--bg-primary, #0a0b0e)",
                  border: "1px solid var(--border, #23252d)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          {/* Save / Delete bar */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--bg-surface, #111214)",
              border: "1px solid var(--border, #23252d)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              {currentEntry ? (
                <button
                  onClick={handleDelete}
                  style={{
                    padding: "8px 20px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "1px",
                    fontFamily: "inherit",
                    background: "rgba(239,68,68,0.1)",
                    color: "var(--accent-loss)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  DELETE ENTRY
                </button>
              ) : (
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {entryDates.has(selectedDate) ? "ENTRY EXISTS" : "NO ENTRY FOR THIS DATE"}
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 32px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "1px",
                fontFamily: "inherit",
                background: saving ? "var(--border, #23252d)" : "var(--text-primary)",
                color: saving ? "var(--text-muted)" : "var(--bg-primary, #0a0b0e)",
                border: "none",
                borderRadius: 8,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "all 0.12s ease",
              }}
            >
              {saving ? "SAVING..." : currentEntry ? "UPDATE ENTRY" : "SAVE ENTRY"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
