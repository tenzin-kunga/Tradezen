"use client";
import { useState } from "react";

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

  return (
    <div
      style={{
        color: "var(--text-primary)",
        fontFamily: "var(--font-display)",
      }}
    >
      <h1 className="text-lg md:text-xl font-bold tracking-widest m-0 mb-6">
        POSITION SIZE CALCULATOR
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <div
          className="rounded p-4 md:p-5"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="text-xs tracking-widest mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            INPUTS
          </div>
          <div className="flex flex-col gap-3">
            {[
              {
                label: "ACCOUNT BALANCE ($)",
                val: balance,
                set: setBalance,
                placeholder: "10000",
              },
              {
                label: "RISK PER TRADE (%)",
                val: riskPct,
                set: setRiskPct,
                placeholder: "1",
              },
              {
                label: "ENTRY PRICE",
                val: entry,
                set: setEntry,
                placeholder: "1.1000",
              },
              {
                label: "STOP LOSS PRICE",
                val: stopLoss,
                set: setStopLoss,
                placeholder: "1.0950",
              },
              {
                label: "PIP VALUE ($)",
                val: pipValue,
                set: setPipValue,
                placeholder: "10",
              },
            ].map((f) => (
              <div key={f.label}>
                <div className="label-caps mb-1">{f.label}</div>
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
        {/* Results */}
        <div
          className="rounded p-4 md:p-5 flex flex-col"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="text-xs tracking-widest mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            RESULTS
          </div>
          <div className="flex flex-col gap-3 flex-1 justify-center">
            {[
              {
                label: "RISK AMOUNT ($)",
                value: risk.toFixed(2),
                color: risk > 0 ? "var(--accent-loss)" : "var(--text-dim)",
              },
              {
                label: "POSITION SIZE (UNITS)",
                value: units.toFixed(2),
                color: "var(--text-primary)",
              },
              {
                label: "POSITION SIZE (LOTS)",
                value: (units / 100000).toFixed(2),
                color: "var(--text-primary)",
              },
              {
                label: "SL DISTANCE (PRICE)",
                value: slDist.toFixed(4),
                color: "var(--text-dim)",
              },
            ].map((r) => (
              <div
                key={r.label}
                className="rounded p-3"
                style={{ backgroundColor: "var(--bg-primary)" }}
              >
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {r.label}
                </div>
                <div className="text-lg font-bold" style={{ color: r.color }}>
                  {r.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
