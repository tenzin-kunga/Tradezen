import type { ReactNode } from "react";

type SectionSurfaceProps = {
  title?: string;
  children: ReactNode;
};

export function SectionSurface({ title, children }: SectionSurfaceProps) {
  return (
    <div className="surface-2 rounded-xl">
      {title && (
        <h3
          className="font-semibold px-5 pt-5 pb-0"
          style={{
            fontSize: "var(--section-title)",
            lineHeight: "var(--section-title--line-height)",
            letterSpacing: "var(--section-title--letter-spacing)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h3>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
