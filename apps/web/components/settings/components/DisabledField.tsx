type DisabledFieldProps = {
  label: string;
  value: string;
  status: "planned" | "experimental" | "beta";
  description?: string;
};

const STATUS_STYLES: Record<
  DisabledFieldProps["status"],
  { label: string; color: string; bg: string; border: string }
> = {
  planned: {
    label: "Planned",
    color: "var(--text-dim)",
    bg: "transparent",
    border: "var(--border)",
  },
  experimental: {
    label: "Experimental",
    color: "var(--accent-insight)",
    bg: "transparent",
    border: "var(--accent-insight)",
  },
  beta: {
    label: "Beta",
    color: "var(--bg-primary)",
    bg: "var(--accent)",
    border: "var(--accent)",
  },
};

export function DisabledField({
  label,
  value,
  status,
  description,
}: DisabledFieldProps) {
  const badge = STATUS_STYLES[status];

  return (
    <div style={{ opacity: 0.5 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-1)",
        }}
      >
        <label
          style={{
            fontSize: "var(--label)",
            fontWeight: 500,
            color: "var(--text-muted)",
          }}
        >
          {label}
        </label>
        <span
          style={{
            fontSize: "0.625rem",
            fontWeight: 600,
            color: badge.color,
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            borderRadius: "var(--radius-full)",
            padding: "2px 8px",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.02em",
          }}
        >
          {badge.label}
        </span>
      </div>
      <div
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-2) var(--space-3)",
          fontSize: "var(--text-sm)",
          color: "var(--text-dim)",
          cursor: "not-allowed",
        }}
      >
        {value}
      </div>
      {description && (
        <p
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-dim)",
            marginTop: "var(--space-1)",
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
