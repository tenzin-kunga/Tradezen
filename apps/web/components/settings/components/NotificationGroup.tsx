"use client";

import { useState } from "react";
import type { NotificationGroupData } from "../types";

type NotificationGroupProps = {
  group: NotificationGroupData;
  preferences: Record<string, boolean>;
  onToggle: (type: string, enabled: boolean) => void;
  savingType: string | null;
};

export function NotificationGroup({
  group,
  preferences,
  onToggle,
  savingType,
}: NotificationGroupProps) {
  const [expanded, setExpanded] = useState(group.defaultExpanded);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-3) 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
        }}
      >
        <span
          style={{
            fontSize: "var(--label)",
            fontWeight: 600,
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {group.title}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform var(--duration-fast) var(--ease-out)",
          }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
      </button>

      {expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
            paddingTop: "var(--space-3)",
          }}
        >
          {group.notifications.map((notification) => (
            <div
              key={notification.type}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)",
                gap: "var(--space-4)",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "var(--label)",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {notification.label}
                </div>
                <div
                  style={{
                    fontSize: "var(--meta)",
                    color: "var(--text-dim)",
                    marginTop: 2,
                  }}
                >
                  {notification.description}
                </div>
              </div>
              <button
                onClick={() =>
                  onToggle(notification.type, !preferences[notification.type])
                }
                disabled={savingType === notification.type}
                aria-label={`${preferences[notification.type] ? "Disable" : "Enable"} ${notification.label}`}
                style={{
                  position: "relative",
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: preferences[notification.type]
                    ? "var(--accent-cyan)"
                    : "var(--border)",
                  border: "none",
                  cursor:
                    savingType === notification.type
                      ? "not-allowed"
                      : "pointer",
                  opacity: savingType === notification.type ? 0.5 : 1,
                  transition: "background var(--duration-fast) var(--ease-out)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: preferences[notification.type] ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "var(--text-primary)",
                    transition: "left var(--duration-fast) var(--ease-out)",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
