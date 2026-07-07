"use client";

import { useEffect, useState, useCallback } from "react";
import {
  createJournal,
  getJournalByDate,
  updateJournal,
  deleteJournal,
  getJournalStreak,
} from "@/lib/api";
import type { WorkspaceResource } from "@/lib/workspace/types";

const moods = [
  { value: "great", label: "GREAT", emoji: "🟢", color: "var(--accent-profit)" },
  { value: "good", label: "GOOD", emoji: "🔵", color: "var(--accent)" },
  { value: "neutral", label: "NEUTRAL", emoji: "⚪", color: "var(--text-dim)" },
  { value: "bad", label: "BAD", emoji: "🟠", color: "var(--accent-warn)" },
  { value: "terrible", label: "TERRIBLE", emoji: "🔴", color: "var(--accent-loss)" },
];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function JournalWorkspace({
  resource,
}: {
  resource: WorkspaceResource;
}) {
  const date = (resource.metadata?.date as string) || toDateStr(new Date());
  const [entry, setEntry] = useState<any>(null);
  const [preMarket, setPreMarket] = useState("");
  const [postMarket, setPostMarket] = useState("");
  const [mood, setMood] = useState("");
  const [marketConditions, setMarketConditions] = useState("");
  const [lessons, setLessons] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEntry = useCallback(async () => {
    try {
      const e = await getJournalByDate(date);
      setEntry(e);
      if (e) {
        setPreMarket(e.pre_market_notes || "");
        setPostMarket(e.post_market_notes || "");
        setMood(e.mood || "");
        setMarketConditions(e.market_conditions || "");
        setLessons(e.lessons || "");
      } else {
        setPreMarket("");
        setPostMarket("");
        setMood("");
        setMarketConditions("");
        setLessons("");
      }
    } catch {
      setPreMarket("");
      setPostMarket("");
      setMood("");
      setMarketConditions("");
      setLessons("");
    }
  }, [date]);

  useEffect(() => {
    loadEntry().finally(() => setLoading(false));
  }, [loadEntry]);

  async function handleSave() {
    setSaving(true);
    try {
      const data = {
        date,
        pre_market_notes: preMarket || undefined,
        post_market_notes: postMarket || undefined,
        mood: mood || undefined,
        market_conditions: marketConditions || undefined,
        lessons: lessons || undefined,
      };
      if (entry?.id) {
        const updated = await updateJournal(entry.id, data);
        setEntry(updated);
      } else {
        const created = await createJournal(data);
        setEntry(created);
      }
    } catch {}
    setSaving(false);
  }

  async function handleDelete() {
    if (!entry?.id) return;
    await deleteJournal(entry.id);
    setEntry(null);
    setPreMarket("");
    setPostMarket("");
    setMood("");
    setMarketConditions("");
    setLessons("");
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-muted, #9ca3af)",
          fontSize: 12,
          letterSpacing: "0.1em",
        }}
      >
        LOADING JOURNAL...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px 24px",
        maxWidth: 720,
        margin: "0 auto",
        overflowY: "auto",
        height: "100%",
      }}
    >
      {/* Date header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--text-primary, #fafafa)",
          }}
        >
          {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              background: "var(--accent, #3b82f6)",
              color: "#fff",
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {entry?.id && (
            <button
              onClick={handleDelete}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                background: "transparent",
                color: "var(--accent-loss, #ef4444)",
                border: "1px solid var(--border, #23252d)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Mood */}
      <div style={{ marginBottom: 20 }}>
        <label
          className="label-caps"
          style={{
            display: "block",
            marginBottom: 8,
            color: "var(--text-dim, #6b7280)",
          }}
        >
          MOOD
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          {moods.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(mood === m.value ? "" : m.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                background:
                  mood === m.value
                    ? "var(--bg-surface-hover, #1a1b23)"
                    : "transparent",
                border:
                  mood === m.value
                    ? `1px solid ${m.color}`
                    : "1px solid var(--border, #23252d)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: mood === m.value ? 600 : 400,
                color:
                  mood === m.value ? m.color : "var(--text-muted, #9ca3af)",
                transition: "all 0.15s",
              }}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-market notes */}
      <div style={{ marginBottom: 20 }}>
        <label
          className="label-caps"
          style={{
            display: "block",
            marginBottom: 8,
            color: "var(--text-dim, #6b7280)",
          }}
        >
          PRE-MARKET NOTES
        </label>
        <textarea
          value={preMarket}
          onChange={(e) => setPreMarket(e.target.value)}
          placeholder="What are your plans for today?"
          style={{
            width: "100%",
            minHeight: 120,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #23252d)",
            background: "var(--bg-surface-hover, #1a1b23)",
            color: "var(--text-primary, #fafafa)",
            fontSize: 13,
            lineHeight: 1.6,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Post-market notes */}
      <div style={{ marginBottom: 20 }}>
        <label
          className="label-caps"
          style={{
            display: "block",
            marginBottom: 8,
            color: "var(--text-dim, #6b7280)",
          }}
        >
          POST-MARKET NOTES
        </label>
        <textarea
          value={postMarket}
          onChange={(e) => setPostMarket(e.target.value)}
          placeholder="How did the day go?"
          style={{
            width: "100%",
            minHeight: 120,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #23252d)",
            background: "var(--bg-surface-hover, #1a1b23)",
            color: "var(--text-primary, #fafafa)",
            fontSize: 13,
            lineHeight: 1.6,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Market conditions */}
      <div style={{ marginBottom: 20 }}>
        <label
          className="label-caps"
          style={{
            display: "block",
            marginBottom: 8,
            color: "var(--text-dim, #6b7280)",
          }}
        >
          MARKET CONDITIONS
        </label>
        <textarea
          value={marketConditions}
          onChange={(e) => setMarketConditions(e.target.value)}
          placeholder="What were the market conditions?"
          style={{
            width: "100%",
            minHeight: 80,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #23252d)",
            background: "var(--bg-surface-hover, #1a1b23)",
            color: "var(--text-primary, #fafafa)",
            fontSize: 13,
            lineHeight: 1.6,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Lessons */}
      <div style={{ marginBottom: 20 }}>
        <label
          className="label-caps"
          style={{
            display: "block",
            marginBottom: 8,
            color: "var(--text-dim, #6b7280)",
          }}
        >
          LESSONS
        </label>
        <textarea
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          placeholder="What did you learn today?"
          style={{
            width: "100%",
            minHeight: 80,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border, #23252d)",
            background: "var(--bg-surface-hover, #1a1b23)",
            color: "var(--text-primary, #fafafa)",
            fontSize: 13,
            lineHeight: 1.6,
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}
