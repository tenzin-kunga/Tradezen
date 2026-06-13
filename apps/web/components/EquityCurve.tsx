"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, LineStyle, AreaSeries, type Time } from "lightweight-charts";

type DataPoint = { date: string; equity: number };

const timeRanges = ["1W", "1M", "3M", "6M", "1Y", "ALL"] as const;

function filterData(data: DataPoint[], range: string): DataPoint[] {
  if (range === "ALL" || data.length === 0) return data;
  const now = new Date();
  const cutoff = new Date(now);
  if (range === "1W") cutoff.setDate(now.getDate() - 7);
  else if (range === "1M") cutoff.setMonth(now.getMonth() - 1);
  else if (range === "3M") cutoff.setMonth(now.getMonth() - 3);
  else if (range === "6M") cutoff.setMonth(now.getMonth() - 6);
  else if (range === "1Y") cutoff.setFullYear(now.getFullYear() - 1);
  return data.filter((d) => new Date(d.date) >= cutoff);
}

type Props = { data: DataPoint[]; loading?: boolean };

export default function EquityCurve({ data, loading }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [activeRange, setActiveRange] = useState("1M");

  const filtered = useMemo(() => filterData(data, activeRange), [data, activeRange]);

  useEffect(() => {
    if (!chartContainerRef.current || filtered.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontSize: 11,
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#23252d" },
      },
      crosshair: {
        vertLine: { color: "#3b82f6", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#3b82f6" },
        horzLine: { color: "#3b82f6", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#3b82f6" },
      },
      rightPriceScale: {
        borderColor: "#23252d",
      },
      timeScale: {
        borderColor: "#23252d",
        timeVisible: false,
        tickMarkFormatter: (time: number) => {
          const d = new Date(time * 1000);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#3b82f6",
      topColor: "rgba(59, 130, 246, 0.3)",
      bottomColor: "rgba(59, 130, 246, 0.01)",
      lineWidth: 2,
    });

    const chartData = filtered.map((d) => ({
      time: Math.floor(new Date(d.date).getTime() / 1000) as Time,
      value: d.equity,
    }));

    series.setData(chartData);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [filtered]);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div style={{ height: 24, width: 120, background: "var(--bg-surface-hover)", borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 300, background: "var(--bg-surface-hover)", borderRadius: 8 }} />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="label-caps" style={{ marginBottom: 16 }}>EQUITY GROWTH</div>
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 11, letterSpacing: "0.1em" }}>
          {data.length === 0 ? "NO DATA" : "NO DATA IN THIS RANGE"}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span className="label-caps">EQUITY GROWTH</span>
        <div style={{ display: "flex", gap: 4 }}>
          {timeRanges.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={`btn-glass ${activeRange === r ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div ref={chartContainerRef} />
    </div>
  );
}
