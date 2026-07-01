"use client";

import { useState, useEffect } from "react";
import {
  getNotificationPreferences,
  updateNotificationPreference,
} from "@/lib/api";
import { NotificationGroup } from "../components/NotificationGroup";
import type { NotificationGroupData } from "../types";

const NOTIFICATION_GROUPS: NotificationGroupData[] = [
  {
    id: "trading",
    title: "Trading Alerts",
    defaultExpanded: true,
    notifications: [
      {
        type: "drawdown_alert",
        label: "Drawdown Alerts",
        description: "Daily drawdown exceeds your limit",
      },
      {
        type: "fomo_warning",
        label: "FOMO Warnings",
        description: "Emotional trading indicators are high",
      },
      {
        type: "coaching",
        label: "Coaching Alerts",
        description: "Losing streak and performance patterns",
      },
    ],
  },
  {
    id: "habits",
    title: "Habits",
    defaultExpanded: false,
    notifications: [
      {
        type: "journal_reminder",
        label: "Journal Reminders",
        description: "Reminders to log your trading reflections",
      },
      {
        type: "discipline_reminder",
        label: "Discipline Reminders",
        description: "Stay disciplined with your trading plan",
      },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    defaultExpanded: false,
    notifications: [
      {
        type: "weekly_summary",
        label: "Weekly Summaries",
        description: "Weekly performance digest and insights",
      },
      {
        type: "streak_milestone",
        label: "Streak Milestones",
        description: "Celebrate your winning streaks and consistency",
      },
    ],
  },
];

export function NotificationSection() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPreferences)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (type: string, enabled: boolean) => {
    setSavingType(type);
    try {
      await updateNotificationPreference(type, enabled);
      setPreferences((prev) => ({ ...prev, [type]: enabled }));
    } catch {
      // noop
    } finally {
      setSavingType(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "var(--space-4)",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "var(--text-sm)",
        }}
      >
        Loading preferences…
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      {NOTIFICATION_GROUPS.map((group, i) => (
        <div
          key={group.id}
          style={{
            borderBottom:
              i < NOTIFICATION_GROUPS.length - 1
                ? "1px solid var(--border)"
                : "none",
          }}
        >
          <NotificationGroup
            group={group}
            preferences={preferences}
            onToggle={handleToggle}
            savingType={savingType}
          />
        </div>
      ))}
    </div>
  );
}
