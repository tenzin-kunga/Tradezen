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

const inputStyle: React.CSSProperties = {
  width: "100%", backgroundColor: "#111111", border: "1px solid #2a2a2a", borderRadius: "4px",
  padding: "10px 12px", color: "#ffffff", fontFamily: "monospace", fontSize: "13px",
  outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px", color: "#888", letterSpacing: "0.12em", marginBottom: "6px", display: "block",
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: "#1c1c1c", border: "1px solid #2a2a2a", borderRadius: "4px", padding: "20px", marginBottom: "16px",
};

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
      <div style={{ minHeight: "100vh", backgroundColor: "#111111", color: "#555", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "12px", letterSpacing: "0.15em" }}>LOADING JOURNAL...</div>
      </div>
    );
  }

  const entryDates = new Set(entries.map((e) => e.date?.slice(0, 10)));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111111", color: "#ffffff", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>TRADE JOURNAL</h1>
          <p style={{ fontSize: "11px", color: "#555", margin: "4px 0 0", letterSpacing: "0.05em" }}>
            DAILY REFLECTION // SELF-AWARENESS ENGINE
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["editor", "history"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{
                background: view === v ? "#fff" : "transparent", color: view === v ? "#111" : "#888",
                border: "1px solid #2a2a2a", borderRadius: "4px", padding: "8px 16px",
                fontFamily: "monospace", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer",
              }}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Streak Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "CURRENT STREAK", value: `${streak.currentStreak} DAY${streak.currentStreak !== 1 ? "S" : ""}`, color: streak.currentStreak >= 7 ? "#22c55e" : "#fff" },
          { label: "LONGEST STREAK", value: `${streak.longestStreak} DAY${streak.longestStreak !== 1 ? "S" : ""}`, color: "#888" },
          { label: "TOTAL ENTRIES", value: `${streak.totalEntries}`, color: "#888" },
        ].map((s) => (
          <div key={s.label} style={{ ...sectionStyle, marginBottom: 0, textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.12em", marginBottom: "8px" }}>{s.label}</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {view === "editor" ? (
        <>
          {/* Date picker */}
          <div style={{ ...sectionStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <label style={labelStyle}>JOURNAL DATE</label>
              <input
                type="date" value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ ...inputStyle, width: "200px" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(toDateStr(d)); }}
                style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#888", padding: "8px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", borderRadius: "4px" }}>
                ← PREV
              </button>
              <button onClick={() => setSelectedDate(toDateStr(new Date()))}
                style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#888", padding: "8px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", borderRadius: "4px" }}>
                TODAY
              </button>
              <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(toDateStr(d)); }}
                style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#888", padding: "8px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", borderRadius: "4px" }}>
                NEXT →
              </button>
            </div>
          </div>

          {/* Mood selector */}
          <div style={sectionStyle}>
            <label style={labelStyle}>EMOTIONAL STATE</label>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {moods.map((m) => (
                <button key={m.value} onClick={() => setMood(m.value)}
                  style={{
                    flex: 1, padding: "12px 8px", backgroundColor: mood === m.value ? `${m.color}22` : "#111",
                    border: `1px solid ${mood === m.value ? m.color : "#2a2a2a"}`, borderRadius: "4px",
                    color: mood === m.value ? m.color : "#555", cursor: "pointer", fontFamily: "monospace",
                    fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textAlign: "center",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: "18px", marginBottom: "4px" }}>{m.emoji}</div>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pre + Post market notes side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={sectionStyle}>
              <label style={labelStyle}>PRE-MARKET NOTES</label>
              <textarea
                style={{ ...inputStyle, minHeight: "150px", resize: "vertical" }}
                value={preMarket} onChange={(e) => setPreMarket(e.target.value)}
                placeholder="What's your game plan for today? Key levels, bias, setups to watch..."
              />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>POST-MARKET NOTES</label>
              <textarea
                style={{ ...inputStyle, minHeight: "150px", resize: "vertical" }}
                value={postMarket} onChange={(e) => setPostMarket(e.target.value)}
                placeholder="How did the session go? What went well, what needs improvement..."
              />
            </div>
          </div>

          {/* Market conditions + Lessons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={sectionStyle}>
              <label style={labelStyle}>MARKET CONDITIONS</label>
              <textarea
                style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
                value={marketConditions} onChange={(e) => setMarketConditions(e.target.value)}
                placeholder="Trending, ranging, choppy, high volatility..."
              />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>KEY LESSONS</label>
              <textarea
                style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
                value={lessons} onChange={(e) => setLessons(e.target.value)}
                placeholder="What did you learn today? Rules to reinforce..."
              />
            </div>
          </div>

          {/* Save / Delete bar */}
          <div style={{
            ...sectionStyle, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              {currentEntry ? (
                <button onClick={handleDelete}
                  style={{ background: "transparent", border: "1px solid #ef444444", color: "#ef4444", padding: "10px 20px", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", borderRadius: "4px" }}>
                  DELETE ENTRY
                </button>
              ) : (
                <span style={{ fontSize: "11px", color: "#555", letterSpacing: "0.08em" }}>
                  {entryDates.has(selectedDate) ? "ENTRY EXISTS" : "NO ENTRY FOR THIS DATE"}
                </span>
              )}
            </div>
            <button onClick={handleSave} disabled={saving}
              style={{
                backgroundColor: saving ? "#333" : "#fff", color: saving ? "#888" : "#111",
                border: "none", borderRadius: "4px", padding: "12px 32px", fontFamily: "monospace",
                fontSize: "12px", fontWeight: 700, letterSpacing: "0.15em", cursor: saving ? "not-allowed" : "pointer",
              }}>
              {saving ? "SAVING..." : currentEntry ? "UPDATE ENTRY" : "SAVE ENTRY"}
            </button>
          </div>
        </>
      ) : (
        /* History View */
        <div style={sectionStyle}>
          <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", marginBottom: "20px" }}>
            JOURNAL HISTORY — {entries.length} ENTRIES
          </div>
          {entries.length === 0 ? (
            <div style={{ color: "#555", fontSize: "12px", textAlign: "center", padding: "40px 0" }}>
              NO JOURNAL ENTRIES YET. START WRITING TODAY.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {entries.map((e) => {
                const moodObj = moods.find((m) => m.value === e.mood);
                return (
                  <button
                    key={e.id}
                    onClick={() => { setSelectedDate(e.date.slice(0, 10)); setView("editor"); }}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      backgroundColor: "#111", border: "1px solid #2a2a2a", borderRadius: "4px",
                      padding: "14px 16px", cursor: "pointer", textAlign: "left", width: "100%",
                      fontFamily: "monospace", transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(el) => { (el.currentTarget as HTMLElement).style.borderColor = "#555"; }}
                    onMouseLeave={(el) => { (el.currentTarget as HTMLElement).style.borderColor = "#2a2a2a"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "18px" }}>{moodObj?.emoji || "⚪"}</span>
                      <div>
                        <div style={{ fontSize: "13px", color: "#fff", fontWeight: 700 }}>
                          {new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                        <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>
                          {e.pre_market_notes ? e.pre_market_notes.slice(0, 80) + (e.pre_market_notes.length > 80 ? "..." : "") : "No pre-market notes"}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: "10px", color: moodObj?.color || "#555", letterSpacing: "0.08em", fontWeight: 700 }}>
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
