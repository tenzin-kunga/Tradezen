type StatCardProps = {
  label: string;
  value: string;
  subtext?: string;
  valueColor?: string;
};

export default function StatCard({ label, value, subtext, valueColor }: StatCardProps) {
  return (
    <div
      className="p-6"
      style={{
        background: "#1c1c1c",
        border: "1px solid #2a2a2a",
      }}
    >
      <div
        className="text-xs font-bold tracking-widest mb-3"
        style={{ color: "#888888", letterSpacing: "0.12em" }}
      >
        {label}
      </div>
      <div
        className="text-3xl font-bold"
        style={{ color: valueColor ?? "#ffffff" }}
      >
        {value}
      </div>
      {subtext && (
        <div className="text-sm mt-1" style={{ color: "#888888" }}>
          {subtext}
        </div>
      )}
    </div>
  );
}
