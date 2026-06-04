type StatCardProps = {
  label: string;
  value: string;
  subtext?: string;
  valueColor?: string;
};

export default function StatCard({ label, value, subtext, valueColor }: StatCardProps) {
  return (
    <div
      className="glass-card glass-card-interactive p-6"
    >
      <div className="label-caps mb-3">
        {label}
      </div>
      <div
        className="mono-data text-3xl font-bold"
        style={{ color: valueColor ?? 'var(--text-primary)' }}
      >
        {value}
      </div>
      {subtext && (
        <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}