"use client";
import { useState, useEffect } from "react";
import { getTags, createTag, tagTrade, untagTrade } from "@/lib/api";

type Tag = {
  id: string;
  name: string;
  color: string;
  category: string;
};

type TagPickerProps = {
  tradeId?: string;
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
};

const TAG_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#e8603c",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#6366f1",
  "#84cc16",
];

export default function TagPicker({ selectedTags, onChange }: TagPickerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [newCategory, setNewCategory] = useState("setup");

  useEffect(() => {
    getTags()
      .then((data) => setTags(data))
      .catch(() => {});
  }, []);

  const selectedIds = new Set(selectedTags.map((t) => t.id));

  function handleToggle(tag: Tag) {
    if (selectedIds.has(tag.id)) {
      onChange(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    try {
      const tag = await createTag({
        name,
        color: newColor,
        category: newCategory,
      });
      setTags([...tags, tag]);
      onChange([...selectedTags, tag]);
      setNewName("");
      setShowCreate(false);
    } catch {}
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.length === 0 && (
          <span
            style={{
              color: "var(--text-dim)",
              fontSize: 12,
              fontStyle: "italic",
            }}
          >
            No tags yet. Create one below.
          </span>
        )}
        {tags.map((tag) => {
          const active = selectedIds.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleToggle(tag)}
              className="text-xs font-semibold tracking-wide border-none cursor-pointer px-3 py-1.5 rounded transition-all"
              style={{
                backgroundColor: active ? tag.color : "var(--bg-primary)",
                color: active ? "#000" : tag.color,
                border: `1px solid ${tag.color}`,
                opacity: active ? 1 : 0.7,
              }}
            >
              {tag.name}
            </button>
          );
        })}
      </div>

      {showCreate && (
        <div
          className="rounded p-3 mb-2"
          style={{
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex flex-col gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name..."
              className="w-full px-2.5 py-1.5 text-xs rounded outline-none"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-display)",
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className="w-4 h-4 rounded-full border-none cursor-pointer p-0"
                    style={{
                      backgroundColor: c,
                      outline:
                        newColor === c
                          ? "2px solid var(--text-primary)"
                          : "none",
                      outlineOffset: 1,
                    }}
                  />
                ))}
              </div>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="text-xs rounded px-2 py-1"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-display)",
                }}
              >
                <option value="setup">SETUP</option>
                <option value="psychology">PSYCHOLOGY</option>
                <option value="risk">RISK</option>
                <option value="custom">CUSTOM</option>
              </select>
              <button
                type="button"
                onClick={handleCreate}
                className="text-xs font-bold tracking-widest border-none cursor-pointer px-3 py-1.5 rounded"
                style={{
                  backgroundColor: "var(--text-primary)",
                  color: "var(--bg-primary)",
                }}
              >
                ADD
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-xs border-none cursor-pointer px-2 py-1 rounded"
                style={{
                  color: "var(--text-muted)",
                  backgroundColor: "transparent",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {!showCreate && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-xs border-none cursor-pointer px-2 py-1 rounded"
          style={{
            color: "var(--accent-cyan)",
            backgroundColor: "transparent",
          }}
        >
          + NEW TAG
        </button>
      )}
    </div>
  );
}

export { TAG_COLORS };
export type { Tag };
