"use client";

import { useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";

export function StickySaveBar() {
  const { dirty, saving, lastSaved, validationErrors, save, reset } =
    useSettings();
  const [visible, setVisible] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);

  useEffect(() => {
    if (dirty) {
      setVisible(true);
      setSavedRecently(false);
    } else if (!saving && !lastSaved) {
      setVisible(false);
    }
  }, [dirty, saving, lastSaved]);

  useEffect(() => {
    if (lastSaved) {
      setSavedRecently(true);
      const timer = setTimeout(() => {
        setSavedRecently(false);
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  const errorCount = Object.keys(validationErrors).length;

  if (!visible && !savedRecently) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-lg)",
        borderTop: "1px solid var(--border)",
        transform:
          visible || savedRecently ? "translateY(0)" : "translateY(100%)",
        transition: "transform var(--duration-normal) var(--ease-out)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--settings-width)",
          margin: "0 auto",
          padding: "var(--space-3) var(--space-6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
        }}
      >
        {savedRecently ? (
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--accent-profit)",
              fontWeight: 500,
            }}
          >
            ✓ Saved
          </span>
        ) : saving ? (
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
            }}
          >
            Saving…
          </span>
        ) : errorCount > 0 ? (
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--accent-warn)",
            }}
          >
            {errorCount} field{errorCount !== 1 ? "s" : ""} need attention
          </span>
        ) : (
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
            }}
          >
            You have unsaved changes
          </span>
        )}

        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <button
            type="button"
            onClick={reset}
            disabled={saving || savedRecently}
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              color: "var(--text-muted)",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2) var(--space-4)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.5 : 1,
              fontFamily: "var(--font-display)",
            }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || savedRecently}
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--bg-primary)",
              background: "var(--text-primary)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2) var(--space-5)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.5 : 1,
              fontFamily: "var(--font-display)",
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
