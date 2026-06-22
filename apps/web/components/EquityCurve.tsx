"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createChart, ColorType, LineStyle, AreaSeries, type Time } from "lightweight-charts";
import { WidgetShell } from "@/components/design-system";

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
      rightPriceScale: { borderColor: "#23252d" },
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

  return (
    <WidgetShell
      title="EQUITY GROWTH"
      headerAction={
        <div className="flex gap-1">
          {timeRanges.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={`btn-glass text-[11px] ${activeRange === r ? "active" : ""}`}
              style={{ padding: "4px 10px" }}
            >
              {r}
            </button>
          ))}
        </div>
      }
      loading={loading}
      isEmpty={filtered.length === 0}
      emptyMessage={data.length === 0 ? "Equity data will appear once you start trading." : "No data in this range. Try a wider time range."}
    >
      <div ref={chartContainerRef} style={filtered.length === 0 ? { height: 300 } : undefined} />
    </WidgetShell>
  );
}
