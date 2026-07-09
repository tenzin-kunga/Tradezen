"use client";

import { useState, useCallback } from "react";
import {
  createJournal,
  getJournalByDate,
  updateJournal,
  deleteJournal,
  getJournalStreak,
} from "@/lib/api";

export interface JournalEntry {
  id: string;
  date: string;
  pre_market_notes: string | null;
  post_market_notes: string | null;
  mood: string | null;
  market_conditions: string | null;
  lessons: string | null;
}

export interface JournalStreak {
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function useJournalEntry(initialDate?: string) {
  const [date, setDate] = useState(initialDate || toDateStr(new Date()));
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [streak, setStreak] = useState<JournalStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntry = useCallback(async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const e = await getJournalByDate(targetDate);
      setEntry(e);
    } catch {
      setEntry(null);
      setError("Failed to load journal entry");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStreak = useCallback(async () => {
    try {
      const s = await getJournalStreak();
      setStreak(s);
    } catch {
      // streak is non-critical
    }
  }, []);

  const save = useCallback(
    async (data: {
      pre_market_notes?: string;
      post_market_notes?: string;
      mood?: string;
      market_conditions?: string;
      lessons?: string;
    }) => {
      const payload = { date, ...data };
      if (entry?.id) {
        const updated = await updateJournal(entry.id, payload);
        setEntry(updated);
        return updated;
      } else {
        const created = await createJournal(payload);
        setEntry(created);
        loadStreak();
        return created;
      }
    },
    [date, entry, loadStreak],
  );

  const remove = useCallback(async () => {
    if (!entry?.id) return;
    await deleteJournal(entry.id);
    setEntry(null);
    loadStreak();
  }, [entry, loadStreak]);

  const goToday = useCallback(() => setDate(toDateStr(new Date())), []);
  const goPrev = useCallback(() => setDate((d) => shiftDate(d, -1)), []);
  const goNext = useCallback(() => setDate((d) => shiftDate(d, 1)), []);

  return {
    date,
    setDate,
    entry,
    streak,
    loading,
    error,
    save,
    remove,
    goToday,
    goPrev,
    goNext,
    loadEntry,
    loadStreak,
  };
}
