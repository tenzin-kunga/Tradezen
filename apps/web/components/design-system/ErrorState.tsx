import Link from "next/link";

type ErrorStateProps = {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onRetry?: () => void;
};

export function ErrorState({
  message,
  actionLabel,
  actionHref,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
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
      <span
        className="text-sm"
        style={{ color: "var(--accent-loss)", maxWidth: 280 }}
      >
        {message}
      </span>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary text-sm no-underline">
          {actionLabel}
        </Link>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn-glass text-xs">
          Retry
        </button>
      )}
    </div>
  );
}
