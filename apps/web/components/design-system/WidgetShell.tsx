"use client";

import { type ReactNode } from "react";

type WidgetShellProps = {
  title?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
};

function WidgetShellSkeleton() {
  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="skeleton" style={{ width: "40%", height: 16 }} />
      <div className="skeleton" style={{ width: "100%", height: 12 }} />
      <div className="skeleton" style={{ width: "85%", height: 12 }} />
      <div className="skeleton" style={{ width: "60%", height: 12 }} />
    </div>
  );
}

function WidgetShellError({ message }: { message: string }) {
  return (
    <div
      className="glass-card p-6 flex flex-col items-center justify-center gap-3 text-center"
      style={{ minHeight: 120 }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--accent-loss)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span className="text-sm" style={{ color: "var(--accent-loss)" }}>
        {message}
      </span>
    </div>
  );
}

function WidgetShellEmpty({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="glass-card p-6 flex flex-col items-center justify-center gap-3 text-center"
      style={{ minHeight: 120 }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-dim)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.4 }}
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
      <span className="text-sm" style={{ color: "var(--text-dim)" }}>
        {message}
      </span>
      {action}
    </div>
  );
}

const paddingMap = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function WidgetShell({
  title,
  headerAction,
  children,
  loading,
  error,
  isEmpty,
  emptyMessage,
  emptyAction,
  className = "",
  padding = "lg",
}: WidgetShellProps) {
  if (loading) return <WidgetShellSkeleton />;
  if (error) return <WidgetShellError message={error} />;
  if (isEmpty)
    return (
      <WidgetShellEmpty
        message={emptyMessage ?? "No data yet."}
        action={emptyAction}
      />
    );

  return (
    <div className={`glass-card ${paddingMap[padding]} ${className}`}>
      {title && (
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 16 }}
        >
          <span className="label-caps">{title}</span>
          {headerAction}
        </div>
      )}
      {children}
    </div>
  );
}
