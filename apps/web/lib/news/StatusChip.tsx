"use client";

import type { EventStatus } from "./types";

const STATUS_CONFIG: Record<
  EventStatus,
  { color: string; bg: string; label: string }
> = {
  upcoming: {
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.1)",
    label: "Upcoming",
  },
  live: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    label: "Live",
  },
  released: {
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
    label: "Released",
  },
};

export default function StatusChip({ status }: { status: EventStatus }) {
  const { color, bg, label } = STATUS_CONFIG[status];

  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        padding: "1px 6px",
        borderRadius: 4,
        backgroundColor: bg,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
        lineHeight: "16px",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
      }}
    >
      {status === "live" && (
        <span
          className="animate-pulse"
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: color,
          }}
        />
      )}
      {label}
    </span>
  );
}
