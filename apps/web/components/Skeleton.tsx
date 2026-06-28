export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex gap-3 items-center py-2.5 px-3 border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} style={{ flex: i === 0 ? 2 : 1, height: 14 }} />
      ))}
    </div>
  );
}

export function TradeLogSkeleton() {
  return (
    <div className="glass-card p-4">
      <Skeleton style={{ width: "40%", height: 18, marginBottom: 16 }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonRow key={i} cols={5} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass-card p-4 flex flex-col gap-2">
      <Skeleton style={{ width: "50%", height: 12 }} />
      <Skeleton style={{ width: "35%", height: 24 }} />
      <Skeleton style={{ width: "30%", height: 12 }} />
    </div>
  );
}
