import type { Impact, ImpactColors } from "./types";

export const IMPACT_COLORS: Record<Impact, ImpactColors> = {
  high: {
    bar: "#ef4444",
    bg: "rgba(239,68,68,0.06)",
    badge: "#ef4444",
    glow: "0 0 12px rgba(239,68,68,0.15)",
  },
  medium: {
    bar: "#f59e0b",
    bg: "rgba(245,158,11,0.06)",
    badge: "#f59e0b",
    glow: "0 0 12px rgba(245,158,11,0.15)",
  },
  low: {
    bar: "#3b82f6",
    bg: "rgba(59,130,246,0.04)",
    badge: "#3b82f6",
    glow: "",
  },
  holiday: {
    bar: "#6b7280",
    bg: "transparent",
    badge: "#6b7280",
    glow: "",
  },
  speech: {
    bar: "#8b5cf6",
    bg: "rgba(139,92,246,0.06)",
    badge: "#8b5cf6",
    glow: "0 0 12px rgba(139,92,246,0.15)",
  },
};
