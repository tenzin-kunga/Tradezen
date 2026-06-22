"use client";

import Link from "next/link";
import { WidgetShell } from "@/components/design-system";

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
  return (
    <WidgetShell
      title="LATEST JOURNAL"
      headerAction={<Link href="/journal" className="text-xs text-accent no-underline">View All →</Link>}
      loading={loading}
      isEmpty={!entry}
      emptyMessage="No journal entries yet. Start building the habit."
      emptyAction={
        <Link href="/journal" className="btn-glass inline-block text-xs no-underline" style={{ padding: "6px 16px" }}>
          Write Entry
        </Link>
      }
    >
      <div className="flex flex-col gap-2">
        {entry?.mood && (
          <div className="flex items-center gap-2 text-base">
            <span>{moodEmoji[entry.mood.toLowerCase()] || "📝"}</span>
            <span className="text-text-primary font-medium">{entry.mood}</span>
          </div>
        )}
        {entry?.market_conditions && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>📈</span>
            <span>{entry.market_conditions}</span>
          </div>
        )}
        {entry?.lesson && (
          <div className="flex items-start gap-2 text-sm text-text-muted">
            <span>💡</span>
            <span className="leading-snug">{entry.lesson}</span>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}
