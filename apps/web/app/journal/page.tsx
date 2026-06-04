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
  const [view, setView] = useState<"editor" | "history">("editor");

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
      <div className="min-h-screen font-mono flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
        <div className="text-xs tracking-widest">LOADING JOURNAL...</div>
      </div>
    );
  }

  const entryDates = new Set(entries.map((e) => e.date?.slice(0, 10)));
  const inputCls = "w-full border px-3 py-2.5 text-sm outline-none box-border focus:border-[#22d3ee]";
  const labelCls = "block text-xs tracking-widest mb-1.5";
  const sectionCls = "border p-4 md:p-5 mb-4";

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-10" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">TRADE JOURNAL</h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "var(--text-dim)" }}>
            DAILY REFLECTION // SELF-AWARENESS ENGINE
          </p>
        </div>
        <div className="flex gap-2">
          {(["editor", "history"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 text-xs font-bold tracking-widest rounded border cursor-pointer transition-colors ${
                view === v ? "" : "bg-transparent"
              }`}
              style={{
                borderColor: "var(--border)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "var(--font-mono)",
                backgroundColor: view === v ? "var(--text-primary)" : undefined,
                color: view === v ? "var(--bg-primary)" : "var(--text-muted)",
              }}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Streak Stats - 1 col mobile, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "CURRENT STREAK", value: `${streak.currentStreak} DAY${streak.currentStreak !== 1 ? "S" : ""}`, color: streak.currentStreak >= 7 ? "var(--accent-profit)" : "var(--text-primary)" },
          { label: "LONGEST STREAK", value: `${streak.longestStreak} DAY${streak.longestStreak !== 1 ? "S" : ""}`, color: "var(--text-muted)" },
          { label: "TOTAL ENTRIES", value: `${streak.totalEntries}`, color: "var(--text-muted)" },
        ].map((s) => (
          <div key={s.label} className={`${sectionCls} mb-0 text-center`} style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-dim)" }}>{s.label}</div>
            <div className="text-lg md:text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {view === "editor" ? (
        <>
          {/* Date picker */}
          <div className={`${sectionCls} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`} style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
            <div>
              <label className={labelCls} style={{ color: "var(--text-muted)" }}>JOURNAL DATE</label>
              <input
                type="date" value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`${inputCls} w-full sm:w-[200px]`}
                style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(toDateStr(d)); }}
                className="bg-transparent px-3 py-2 cursor-pointer text-xs rounded"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", borderRadius: "var(--radius-sm)" }}>
                ← PREV
              </button>
              <button onClick={() => setSelectedDate(toDateStr(new Date()))}
                className="bg-transparent px-3 py-2 cursor-pointer text-xs rounded"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", borderRadius: "var(--radius-sm)" }}>
                TODAY
              </button>
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(toDateStr(d)); }}
                className="bg-transparent px-3 py-2 cursor-pointer text-xs rounded"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", borderRadius: "var(--radius-sm)" }}>
                NEXT →
              </button>
            </div>
          </div>

          {/* Mood selector - wrap on mobile */}
          <div className={sectionCls} style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>EMOTIONAL STATE</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {moods.map((m) => (
                <button key={m.value} onClick={() => setMood(m.value)}
                  className="flex-1 min-w-[60px] px-2 py-3 text-xs font-bold tracking-wide rounded border text-center transition-all"
                  style={{
                    backgroundColor: mood === m.value ? `${m.color}22` : "var(--bg-primary)",
                    border: `1px solid ${mood === m.value ? m.color : "var(--border)"}`,
                    color: mood === m.value ? m.color : "var(--text-dim)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div className="text-lg mb-1">{m.emoji}</div>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pre + Post market notes - stack on mobile, side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={sectionCls} style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
              <label className={labelCls} style={{ color: "var(--text-muted)" }}>PRE-MARKET NOTES</label>
              <textarea
                className={`${inputCls} min-h-[120px] resize-y`}
                value={preMarket} onChange={(e) => setPreMarket(e.target.value)}
                placeholder="What's your game plan for today? Key levels, bias, setups to watch..."
                style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div className={sectionCls} style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
              <label className={labelCls} style={{ color: "var(--text-muted)" }}>POST-MARKET NOTES</label>
              <textarea
                className={`${inputCls} min-h-[120px] resize-y`}
                value={postMarket} onChange={(e) => setPostMarket(e.target.value)}
                placeholder="How did the session go? What went well, what needs improvement..."
                style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>

          {/* Market conditions + Lessons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={sectionCls} style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
              <label className={labelCls} style={{ color: "var(--text-muted)" }}>MARKET CONDITIONS</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                value={marketConditions} onChange={(e) => setMarketConditions(e.target.value)}
                placeholder="Trending, ranging, choppy, high volatility..."
                style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              />
            </div>
            <div className={sectionCls} style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
              <label className={labelCls} style={{ color: "var(--text-muted)" }}>KEY LESSONS</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                value={lessons} onChange={(e) => setLessons(e.target.value)}
                placeholder="What did you learn today? Rules to reinforce..."
                style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
              />
            </div>
          </div>

          {/* Save / Delete bar */}
          <div className={`${sectionCls} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`} style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
            <div>
              {currentEntry ? (
                <button onClick={handleDelete}
                  className="bg-transparent border border-red-500/25 text-red-500 px-5 py-2.5 cursor-pointer text-xs font-bold tracking-widest rounded"
                  style={{ fontFamily: "var(--font-mono)", borderRadius: "var(--radius-sm)" }}>
                  DELETE ENTRY
                </button>
              ) : (
                <span className="text-xs tracking-wide" style={{ color: "var(--text-dim)" }}>
                  {entryDates.has(selectedDate) ? "ENTRY EXISTS" : "NO ENTRY FOR THIS DATE"}
                </span>
              )}
            </div>
            <button onClick={handleSave} disabled={saving}
              className={`px-8 py-3 text-xs font-bold tracking-widest rounded ${saving ? "cursor-not-allowed" : "cursor-pointer"}`}
              style={{
                fontFamily: "var(--font-mono)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: saving ? "var(--border)" : "var(--text-primary)",
                color: saving ? "var(--text-muted)" : "var(--bg-primary)",
              }}>
              {saving ? "SAVING..." : currentEntry ? "UPDATE ENTRY" : "SAVE ENTRY"}
            </button>
          </div>
        </>
      ) : (
        /* History View */
        <div className={sectionCls} style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
          <div className="text-xs tracking-widest mb-5" style={{ color: "var(--text-dim)" }}>
            JOURNAL HISTORY — {entries.length} ENTRIES
          </div>
          {entries.length === 0 ? (
            <div className="text-sm text-center py-10" style={{ color: "var(--text-dim)" }}>
              NO JOURNAL ENTRIES YET. START WRITING TODAY.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map((e) => {
                const moodObj = moods.find((m) => m.value === e.mood);
                return (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedDate(e.date.slice(0, 10)); setView("editor"); }}
                    className="flex justify-between items-center border rounded px-4 py-3.5 cursor-pointer text-left w-full transition-colors"
                    style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-mono)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{moodObj?.emoji || "⚪"}</span>
                      <div>
                        <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                          {new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
                          {e.pre_market_notes ? e.pre_market_notes.slice(0, 80) + (e.pre_market_notes.length > 80 ? "..." : "") : "No pre-market notes"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs tracking-wide font-bold" style={{ color: moodObj?.color || "var(--text-dim)" }}>
                      {moodObj?.label || "—"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
