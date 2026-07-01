"use client";

import type { ReactNode } from "react";

type OptionCardProps = {
  selected: boolean;
  label: string;
  preview: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
};

export function OptionCard({
  selected,
  label,
  preview,
  onSelect,
  disabled,
  disabledReason,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      style={{
        width: 104,
        height: 72,
        display: "flex",
        flexDirection: "column",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: selected
          ? "2px solid var(--accent)"
          : "2px solid var(--border)",
        background: "var(--bg-primary)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        padding: 0,
        transition: "border-color var(--duration-fast) var(--ease-out)",
        position: "relative",
      }}
    >
      <div
        style={{
          flex: 1,
          overflow: "hidden",
        }}
      >
        {preview}
      </div>
      <div
        style={{
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderTop: "1px solid var(--border)",
          fontSize: "var(--meta)",
          fontWeight: 500,
          color: selected ? "var(--text-primary)" : "var(--text-muted)",
          fontFamily: "var(--font-display)",
        }}
      >
        {label}
      </div>
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="var(--bg-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 5l2.5 2.5L8 3" />
          </svg>
        </div>
      )}
      {disabled && disabledReason && (
        <div
          style={{
            position: "absolute",
            bottom: 22,
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: "0.55rem",
            color: "var(--text-dim)",
            fontFamily: "var(--font-display)",
          }}
        >
          {disabledReason}
        </div>
      )}
    </button>
  );
}
