import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const base: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  borderRadius: 8,
  fontFamily: "inherit",
  fontWeight: 600,
  fontSize: 13,
  lineHeight: 1,
  cursor: "pointer",
  border: "1px solid transparent",
  transition:
    "background 0.15s var(--ease-out), border-color 0.15s, opacity 0.15s, transform 0.1s",
  whiteSpace: "nowrap",
};

const variants: Record<Variant, CSSProperties> = {
  primary: {
    background: "var(--grad-accent)",
    color: "#fff",
    borderColor: "transparent",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-primary)",
    borderColor: "var(--border)",
  },
  subtle: {
    background: "var(--bg-surface-hover)",
    color: "var(--text-primary)",
    borderColor: "var(--border-soft)",
  },
  danger: {
    background: "transparent",
    color: "var(--accent-loss)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
};

export function Button({
  variant = "primary",
  size = "md",
  style,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`tz-focus ${className}`}
      style={{
        ...base,
        padding: size === "sm" ? "6px 10px" : "8px 14px",
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
