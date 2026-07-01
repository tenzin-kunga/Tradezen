import type { ReactNode } from "react";
import type { SectionDefinition } from "@/lib/section-types";
import { SectionSurface } from "./SectionSurface";
import { ErrorState } from "./ErrorState";
import EmptyState from "@/components/EmptyState";

type SectionRendererProps = {
  section: SectionDefinition;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  onRetry?: () => void;
};

function SectionSkeleton() {
  return (
    <div className="surface-2 rounded-xl p-5 flex flex-col gap-4">
      <div className="skeleton" style={{ width: "40%", height: 16 }} />
      <div className="skeleton" style={{ width: "100%", height: 12 }} />
      <div className="skeleton" style={{ width: "85%", height: 12 }} />
      <div className="skeleton" style={{ width: "60%", height: 12 }} />
    </div>
  );
}

export function SectionRenderer({
  section,
  children,
  loading,
  error,
  isEmpty,
  emptyMessage,
  emptyActionLabel,
  emptyActionHref,
  onRetry,
}: SectionRendererProps) {
  if (loading) return <SectionSkeleton />;

  if (error) {
    return (
      <SectionSurface title={section.title}>
        <ErrorState message={error} onRetry={onRetry} />
      </SectionSurface>
    );
  }

  if (isEmpty) {
    return (
      <SectionSurface title={section.title}>
        <EmptyState
          title={section.question}
          description={emptyMessage ?? "No data available yet."}
          actionLabel={emptyActionLabel}
          actionHref={emptyActionHref}
        />
      </SectionSurface>
    );
  }

  return <SectionSurface title={section.title}>{children}</SectionSurface>;
}
