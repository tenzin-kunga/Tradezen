import type { LucideIcon } from "lucide-react";

type SectionHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
};

export function SectionHeader({
  icon: Icon,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        marginBottom: "var(--section-gap)",
      }}
    >
      <Icon size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <div>
        <div
          style={{
            fontSize: "var(--section-title)",
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: "var(--section-title--line-height)",
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: "var(--body)",
              color: "var(--text-dim)",
              lineHeight: "var(--body--line-height)",
              marginTop: 2,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
