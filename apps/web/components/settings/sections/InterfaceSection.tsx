"use client";

import { useSettings } from "../context/SettingsContext";
import { OptionCardGroup } from "../components/OptionCardGroup";

type ThemeId = "dark" | "light" | "midnight" | "tradingview";

function ThemePreviewCard(tokens: {
  bg: string;
  surface: string;
  accent: string;
  border: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: tokens.bg,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          flex: 1,
          background: tokens.surface,
          borderRadius: 4,
          border: `1px solid ${tokens.border}`,
        }}
      />
      <div style={{ display: "flex", gap: 4 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: tokens.accent,
          }}
        />
        <div
          style={{
            flex: 1,
            height: 12,
            background: tokens.surface,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

const THEME_OPTIONS = [
  {
    value: "dark",
    label: "Dark",
    preview: (
      <ThemePreviewCard
        bg="#09090b"
        surface="#111214"
        accent="#3b82f6"
        border="#23252d"
      />
    ),
  },
  {
    value: "light",
    label: "Light",
    preview: (
      <ThemePreviewCard
        bg="#f4f5f7"
        surface="#ffffff"
        accent="#2563eb"
        border="#d4d7dd"
      />
    ),
  },
  {
    value: "midnight",
    label: "Midnight",
    preview: (
      <ThemePreviewCard
        bg="#030305"
        surface="#08080c"
        accent="#3b82f6"
        border="#151519"
      />
    ),
  },
  {
    value: "tradingview",
    label: "TradingView",
    preview: (
      <ThemePreviewCard
        bg="#131722"
        surface="#1e222d"
        accent="#2962ff"
        border="#2a2e39"
      />
    ),
  },
];

export function InterfaceSection() {
  const { values, update } = useSettings();

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "var(--label)",
          fontWeight: 500,
          color: "var(--text-muted)",
          marginBottom: "var(--space-3)",
        }}
      >
        Theme
      </label>
      <OptionCardGroup
        options={THEME_OPTIONS}
        value={values.theme as ThemeId}
        onChange={(v) => update("theme", v)}
      />
    </div>
  );
}
