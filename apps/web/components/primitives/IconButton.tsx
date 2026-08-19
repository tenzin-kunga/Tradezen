import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: number;
  active?: boolean;
  children?: ReactNode;
}

export function IconButton({
  size = 28,
  active = false,
  style,
  className = "",
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      className={`tz-focus ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "var(--bg-surface-hover)" : "transparent",
        border: `1px solid ${active ? "var(--border)" : "transparent"}`,
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.15s, color 0.15s, border-color 0.15s",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export default IconButton;
