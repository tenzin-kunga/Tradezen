"use client";
import DashboardShell from "@/components/DashboardShell";
import PositionSizeCalculator from "@/components/PositionSizeCalculator";

export default function CalculatorPage() {
  return (
    <DashboardShell>
      <h1
        className="text-lg md:text-xl font-bold tracking-tight m-0 mb-6"
        style={{ color: "var(--text-primary)" }}
      >
        Position Size Calculator
      </h1>
      <PositionSizeCalculator />
    </DashboardShell>
  );
}
