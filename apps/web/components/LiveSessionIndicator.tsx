"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const SESSIONS = [
  {
    name: "Asian",
    label: "Asian Session",
    utcStart: 18,
    utcEnd: 7,
    color: "var(--accent-warn)",
  },
  {
    name: "London",
    label: "London Session",
    utcStart: 7,
    utcEnd: 13,
    color: "var(--accent-profit)",
  },
  {
    name: "New York",
    label: "New York Open",
    utcStart: 13,
    utcEnd: 18,
    color: "var(--accent)",
  },
] as const;

function getSession(utcH: number) {
  if (utcH >= 7 && utcH < 13) return SESSIONS[1];
  if (utcH >= 13 && utcH < 18) return SESSIONS[2];
  return SESSIONS[0];
}

function timeRemaining(utcH: number, session: (typeof SESSIONS)[number]) {
  const endHour =
    session.name === "Asian"
      ? utcH >= 18
        ? 24
        : 7
      : session.utcEnd;
  const remainingMin = endHour * 60 - (utcH * 60 + new Date().getUTCMinutes());
  const h = Math.floor(remainingMin / 60);
  const m = remainingMin % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default function LiveSessionIndicator() {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const tz =
    user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const session = getSession(now.getUTCHours());

  const localTime = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(now);

  return (
    <div
      className="surface-1 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2"
      style={{ border: `1px solid ${session.color}33` }}
    >
      <div className="flex items-center gap-2.5">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: session.color,
            boxShadow: `0 0 8px ${session.color}`,
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        />
        <span
          className="text-[10px] font-bold tracking-widest"
          style={{ color: session.color }}
        >
          LIVE
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          {session.label}
        </span>
      </div>
      <span style={{ fontSize: "var(--meta)", color: "var(--text-dim)" }}>
        Closes in {timeRemaining(now.getUTCHours(), session)}
      </span>
      <span style={{ fontSize: "var(--meta)", color: "var(--text-muted)" }}>
        Your time · {localTime}
      </span>
    </div>
  );
}
