"use client";

import { useEffect, useState } from "react";
import type { WorkspaceResource } from "@/lib/workspace/types";
import { useJournalEntry } from "@/hooks/useJournalEntry";
import { Skeleton } from "@/components/primitives/Skeleton";

const moods = [
  {
    value: "great",
    label: "GREAT",
    emoji: "🟢",
    color: "var(--accent-profit)",
  },
  { value: "good", label: "GOOD", emoji: "🔵", color: "var(--accent)" },
  { value: "neutral", label: "NEUTRAL", emoji: "⚪", color: "var(--text-dim)" },
  { value: "bad", label: "BAD", emoji: "🟠", color: "var(--accent-warn)" },
  {
    value: "terrible",
    label: "TERRIBLE",
    emoji: "🔴",
    color: "var(--accent-loss)",
  },
];

export default function JournalWorkspace({
  resource,
}: {
  resource: WorkspaceResource;
}) {
  const initialDate = (resource.metadata?.date as string) || undefined;
  const {
    date,
    entry,
    streak,
    loading,
    save,
    remove,
    goToday,
    goPrev,
    goNext,
    loadEntry,
    loadStreak,
  } = useJournalEntry(initialDate);

  const [preMarket, setPreMarket] = useState("");
  const [postMarket, setPostMarket] = useState("");
  const [mood, setMood] = useState("");
  const [marketConditions, setMarketConditions] = useState("");
  const [lessons, setLessons] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEntry(date);
    loadStreak();
  }, [date, loadEntry, loadStreak]);

  useEffect(() => {
    if (entry) {
      setPreMarket(entry.pre_market_notes || "");
      setPostMarket(entry.post_market_notes || "");
      setMood(entry.mood || "");
      setMarketConditions(entry.market_conditions || "");
      setLessons(entry.lessons || "");
    } else {
      setPreMarket("");
      setPostMarket("");
      setMood("");
      setMarketConditions("");
      setLessons("");
    }
  }, [entry]);

  async function handleSave() {
    setSaving(true);
    try {
      await save({
        pre_market_notes: preMarket || undefined,
        post_market_notes: postMarket || undefined,
        mood: mood || undefined,
        market_conditions: marketConditions || undefined,
        lessons: lessons || undefined,
      });
    } catch {}
    setSaving(false);
  }

  async function handleDelete() {
    await remove();
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
          padding: "20px 24px",
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Skeleton height={28} width={260} />
        <Skeleton height={44} radius={8} />
        <Skeleton height={120} radius={8} />
        <Skeleton height={120} radius={8} />
        <Skeleton height={80} radius={8} />
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
      {/* Date header + navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={goPrev}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "transparent",
              border: "1px solid var(--border, #23252d)",
              cursor: "pointer",
              color: "var(--text-muted, #9ca3af)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <button
            onClick={goToday}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              background: "transparent",
              border: "1px solid var(--border, #23252d)",
              cursor: "pointer",
              color: "var(--text-muted, #9ca3af)",
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            Today
          </button>
          <button
            onClick={goNext}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "transparent",
              border: "1px solid var(--border, #23252d)",
              cursor: "pointer",
              color: "var(--text-muted, #9ca3af)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            →
          </button>
        </div>

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

      {/* Streak */}
      {streak && streak.currentStreak > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--bg-surface-hover, #1a1b23)",
            border: "1px solid var(--border, #23252d)",
            fontSize: 12,
            color: "var(--text-muted, #9ca3af)",
          }}
        >
          🔥 {streak.currentStreak} day streak · {streak.longestStreak} longest
          · {streak.totalEntries} total
        </div>
      )}

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
