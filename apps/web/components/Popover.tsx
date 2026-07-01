"use client";

import { useRef, useEffect, type ReactNode } from "react";

type PopoverProps = {
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "left" | "right";
  minWidth?: number;
};

export default function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  align = "left",
  minWidth = 280,
}: PopoverProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onOpenChange(false);
      }
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onOpenChange]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div ref={triggerRef} onClick={() => onOpenChange(!open)}>
        {trigger}
      </div>
      {open && (
        <div
          ref={popoverRef}
          className="animate-scale-in"
          style={{
            position: "absolute",
            top: "100%",
            marginTop: "var(--space-2)",
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            zIndex: 50,
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-xl)",
            border: "none",
            minWidth,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
