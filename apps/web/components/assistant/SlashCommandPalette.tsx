"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCommandRegistry } from "@/lib/workspace/command-registry";

interface SlashCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: string) => void;
  filter: string;
}

export default function SlashCommandPalette({
  isOpen,
  onClose,
  onSelect,
  filter,
}: SlashCommandPaletteProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo(() => {
    if (!isOpen) return [];
    const registry = getCommandRegistry();
    const all = registry.getAll();
    if (!filter) return all;
    const lower = filter.toLowerCase();
    return all.filter(
      (c) =>
        c.command.toLowerCase().includes(lower) ||
        c.label.toLowerCase().includes(lower),
    );
  }, [isOpen, filter]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [commands.length, filter]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, commands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = commands[selectedIdx];
        if (cmd) {
          onSelect(`/${cmd.command}`);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [commands, selectedIdx, onSelect, onClose],
  );

  if (!isOpen || commands.length === 0) return null;

  return (
      <div
        className="tz-panel"
        style={{
          position: "absolute",
          bottom: "100%",
          left: 16,
          right: 16,
          marginBottom: 8,
          borderRadius: 12,
          boxShadow: "var(--shadow-pop)",
          overflow: "hidden",
          zIndex: 50,
        }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={listRef}
        style={{ maxHeight: 280, overflowY: "auto", padding: "4px" }}
      >
        {commands.map((cmd, idx) => (
          <div
            key={`${cmd.namespace}:${cmd.command}`}
            onClick={() => {
              onSelect(`/${cmd.command}`);
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
              background:
                idx === selectedIdx
                  ? "var(--bg-surface-hover, #1a1b23)"
                  : "transparent",
              transition: "background 0.1s",
            }}
          >
            {cmd.icon && (
              <span style={{ fontSize: 14, flexShrink: 0 }}>{cmd.icon}</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary, #fafafa)",
                }}
              >
                /{cmd.command}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted, #9ca3af)",
                  marginTop: 1,
                }}
              >
                {cmd.description}
              </div>
            </div>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-dim, #6b7280)",
                textTransform: "capitalize",
              }}
            >
              {cmd.namespace}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
