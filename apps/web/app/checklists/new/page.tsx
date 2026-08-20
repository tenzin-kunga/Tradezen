"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createChecklist } from "@/lib/api";
import { useToast } from "@/components/Toast";

type Item = { title: string; isCritical: boolean };

export default function NewChecklistPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<Item[]>([
    { title: "", isCritical: false },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function addItem() {
    setItems([...items, { title: "", isCritical: false }]);
  }

  function removeItem(i: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof Item, value: string | boolean) {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  }

  function moveItem(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validItems = items.filter((it) => it.title.trim().length > 0);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (validItems.length === 0) {
      setError("At least one item is required.");
      return;
    }

    setSubmitting(true);
    try {
      await createChecklist({
        name: name.trim(),
        description: description.trim() || undefined,
        items: validItems.map((it) => ({
          title: it.title.trim(),
          isCritical: it.isCritical,
        })),
      });
      addToast("success", "Checklist created");
      router.push("/checklists");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-sm outline-none box-border";
  const labelCls = "block text-xs tracking-widest mb-1.5";

  return (
    <div>
      <h1 className="text-lg md:text-xl font-bold tracking-widest mb-1">
        NEW CHECKLIST
      </h1>
      <p
        className="text-xs mb-6 tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        DEFINE YOUR TRADE PREPARATION PROTOCOL
      </p>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        <div className="glass-card p-4 md:p-5 mb-4">
          <label className={labelCls}>CHECKLIST NAME</label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. SMC Entry Checklist"
          />

          <label className={`${labelCls} mt-4`}>DESCRIPTION (optional)</label>
          <textarea
            className={`${inputCls} min-h-[60px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this checklist for?"
          />
        </div>

        <div className="glass-card p-4 md:p-5 mb-4">
          <div className="flex justify-between items-center mb-4">
            <span className="label-caps">ITEMS</span>
            <button
              type="button"
              onClick={addItem}
              className="btn-primary text-xs"
            >
              + ADD ITEM
            </button>
          </div>

          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 mb-3 p-3"
              style={{
                background: "var(--bg-glass)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div className="flex flex-col gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => moveItem(i, -1)}
                  className="text-xs p-0.5"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(i, 1)}
                  className="text-xs p-0.5"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  ▼
                </button>
              </div>
              <div className="flex-1">
                <input
                  className={inputCls}
                  value={item.title}
                  onChange={(e) => updateItem(i, "title", e.target.value)}
                  placeholder="Checklist item..."
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isCritical}
                    onChange={(e) =>
                      updateItem(i, "isCritical", e.target.checked)
                    }
                    style={{ accentColor: "var(--accent-warn)" }}
                  />
                  <span
                    className="text-xs"
                    style={{
                      color: item.isCritical
                        ? "var(--accent-warn)"
                        : "var(--text-muted)",
                    }}
                  >
                    Critical
                  </span>
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-xs px-2 py-1"
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--accent-loss)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div className="text-sm mb-4" style={{ color: "var(--accent-loss)" }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-xs"
          >
            {submitting ? "SAVING..." : "SAVE CHECKLIST"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-glass text-xs"
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
}
