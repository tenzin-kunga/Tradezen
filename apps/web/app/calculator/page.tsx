"use client";
import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function CalculatorPage() {
  const [balance, setBalance] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");
  const [entry, setEntry] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [pipValue, setPipValue] = useState("10");

  const account = parseFloat(balance) || 0;
  const risk = (account * (parseFloat(riskPct) || 0)) / 100;
  const e = parseFloat(entry);
  const sl = parseFloat(stopLoss);
  const slDist = e && sl ? Math.abs(e - sl) : 0;
  const pipAmt = parseFloat(pipValue) || 10;
  const positionSize = slDist > 0 ? risk / slDist : 0;
  const units = slDist > 0 ? (risk / slDist) * pipAmt : 0;
  const lots = units / 100000;

  const hasRisk = risk > 0;

  return (
    <DashboardShell>
      <h1
        className="text-lg md:text-xl font-bold tracking-tight m-0 mb-6"
        style={{ color: "var(--text-primary)" }}
      >
        Position Size Calculator
      </h1>

      {/* Hero Result */}
      <div className="surface-1 rounded-xl p-6 md:p-8 mb-4 text-center">
        <div
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-muted)",
            fontWeight: 500,
            marginBottom: "var(--space-2)",
          }}
        >
          Position Size
        </div>
        <div
          style={{
            fontSize: "var(--metric-hero)",
            fontWeight: 800,
            color: hasRisk ? "var(--text-primary)" : "var(--text-dim)",
            lineHeight: "var(--metric-hero--line-height)",
          }}
        >
          {hasRisk ? lots.toFixed(2) : "0.00"}
        </div>
        <div
          style={{
            fontSize: "var(--text-lg)",
            color: "var(--text-muted)",
            fontWeight: 500,
            marginTop: 2,
          }}
        >
          Lots
        </div>

        {hasRisk && (
          <div
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-4"
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-dim)",
            }}
          >
            <span>
              Risk{" "}
              <span style={{ color: "var(--accent-loss)", fontWeight: 600 }}>
                ${risk.toFixed(2)}
              </span>
            </span>
            <span>
              Units{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {units.toFixed(0)}
              </span>
            </span>
            <span>
              SL Distance{" "}
              <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>
                {slDist.toFixed(4)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="surface-1 rounded-xl p-4 md:p-5">
        <div
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          Trade Parameters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              label: "Account Balance ($)",
              val: balance,
              set: setBalance,
              placeholder: "10000",
            },
            {
              label: "Risk Per Trade (%)",
              val: riskPct,
              set: setRiskPct,
              placeholder: "1",
            },
            {
              label: "Entry Price",
              val: entry,
              set: setEntry,
              placeholder: "1.1000",
            },
            {
              label: "Stop Loss Price",
              val: stopLoss,
              set: setStopLoss,
              placeholder: "1.0950",
            },
            {
              label: "Pip Value ($)",
              val: pipValue,
              set: setPipValue,
              placeholder: "10",
            },
          ].map((f) => (
            <div key={f.label}>
              <div
                className="text-xs mb-1.5"
                style={{ color: "var(--text-muted)", fontWeight: 500 }}
              >
                {f.label}
              </div>
              <input
                type="number"
                step="any"
                value={f.val}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.placeholder}
                className="input-glass text-xs w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
