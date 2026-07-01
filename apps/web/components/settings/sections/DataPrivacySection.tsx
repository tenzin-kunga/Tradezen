"use client";

import { useState } from "react";
import { seedMockData, deleteAllSeedData } from "@/lib/api";

export function DataPrivacySection() {
  const [seeding, setSeeding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );

  const handleLoadSample = async () => {
    setSeeding(true);
    setMessage("");
    setMessageType(null);
    try {
      const res = await seedMockData();
      setMessage(res.message);
      setMessageType("success");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Failed to load sample data",
      );
      setMessageType("error");
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure? This will permanently delete ALL your trades, journals, and tags. This cannot be undone.",
      )
    )
      return;
    setDeleting(true);
    setMessage("");
    setMessageType(null);
    try {
      const res = await deleteAllSeedData();
      setMessage(res.message);
      setMessageType("success");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete data");
      setMessageType("error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "var(--label)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "var(--space-1)",
          }}
        >
          Sample Data
        </div>
        <p
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-dim)",
            marginBottom: "var(--space-3)",
          }}
        >
          Load sample trades to explore features
        </p>
        <button
          type="button"
          onClick={handleLoadSample}
          disabled={seeding}
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--bg-primary)",
            background: "var(--accent-profit)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-5)",
            cursor: seeding ? "not-allowed" : "pointer",
            opacity: seeding ? 0.5 : 1,
            fontFamily: "var(--font-display)",
          }}
        >
          {seeding ? "Loading…" : "Load Sample Data"}
        </button>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "var(--space-6)",
        }}
      >
        <div
          style={{
            fontSize: "var(--label)",
            fontWeight: 600,
            color: "var(--accent-loss)",
            marginBottom: "var(--space-1)",
          }}
        >
          Danger Zone
        </div>
        <p
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-dim)",
            marginBottom: "var(--space-3)",
          }}
        >
          Deleting your data is permanent and cannot be undone
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--accent-loss)",
            background: "none",
            border: "1px solid var(--accent-loss)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-2) var(--space-5)",
            cursor: deleting ? "not-allowed" : "pointer",
            opacity: deleting ? 0.5 : 1,
            fontFamily: "var(--font-display)",
          }}
        >
          {deleting ? "Deleting…" : "Delete All Data"}
        </button>
      </div>

      {message && (
        <div
          style={{
            fontSize: "var(--text-sm)",
            color:
              messageType === "error"
                ? "var(--accent-loss)"
                : "var(--accent-profit)",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
