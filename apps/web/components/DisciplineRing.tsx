"use client";

type DisciplineRingProps = {
  value: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  label?: string;
};

export default function DisciplineRing({
  value,
  size = 72,
  strokeWidth = 3,
  label = "Discipline",
}: DisciplineRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  const color =
    value >= 80
      ? "var(--accent-profit)"
      : value >= 60
        ? "var(--accent)"
        : "var(--accent-loss)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-2)",
        position: "relative",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 0.6s var(--ease-out), stroke 0.4s var(--ease-out)",
          }}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: size / 2 - 14,
        }}
      >
        <span
          style={{
            fontSize: "var(--metric-secondary)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {Math.round(value)}
        </span>
        <span
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-muted)",
            fontWeight: 500,
            marginTop: 2,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
