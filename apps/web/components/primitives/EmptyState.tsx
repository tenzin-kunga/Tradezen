import type { CSSProperties, ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  style?: CSSProperties;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        color: "var(--text-muted)",
        gap: 10,
        ...style,
      }}
    >
      {icon && (
        <div
          style={{
            color: "var(--text-dim)",
            marginBottom: 4,
            display: "flex",
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}
      >
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 12.5, maxWidth: 320, lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export default EmptyState;
