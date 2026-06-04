"use client";
import { useEffect, useState, useMemo } from "react";
import { getDailyPnl, getTrades } from "@/lib/api";

interface DayData {
  date: string;
  pnl: number;
  trades: number;
}

function getMonthDays(year: number, month: number): (DayData | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days: (DayData | null)[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      pnl: 0,
      trades: 0,
    });
  }

  return days;
}

function getPnLColor(pnl: number): string {
  if (pnl > 0) return "var(--accent-profit)";
  if (pnl < 0) return "var(--accent-loss)";
  return "var(--border)";
}

function getHeatIntensity(pnl: number, maxPnl: number): number {
  if (maxPnl === 0) return 0;
  return Math.min(Math.abs(pnl) / Math.abs(maxPnl), 1);
}

export default function CalendarPage() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [dailyData, setDailyData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [dayTrades, setDayTrades] = useState<any[]>([]);

  useEffect(() => {
    const firstDay = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const lastDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${lastDay}`;

    Promise.all([
      getDailyPnl(firstDay, lastDayStr),
      getTrades({ from: firstDay, to: lastDayStr, limit: 1000 }),
    ])
      .then(([dailyRes, tradesRes]) => {
        setDailyData(dailyRes);

        const dayMap: Record<string, { pnl: number; trades: any[] }> = {};
        tradesRes.data.forEach((t: any) => {
          const date = t.trade_date?.split("T")[0] || t.created_at?.split("T")[0];
          if (date && date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`)) {
            if (!dayMap[date]) dayMap[date] = { pnl: 0, trades: [] };
            dayMap[date].pnl += Number(t.pnl);
            dayMap[date].trades.push(t);
          }
        });

        const updatedDaily: DayData[] = dailyRes.map((d: any) => ({
          date: d.date,
          pnl: dayMap[d.date]?.pnl ?? d.pnl ?? 0,
          trades: dayMap[d.date]?.trades?.length ?? 0,
        }));
        setDailyData(updatedDaily);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [currentYear, currentMonth]);

  const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const maxPnl = useMemo(() => {
    return Math.max(...dailyData.map((d) => Math.abs(d.pnl)), 1);
  }, [dailyData]);

  const monthPnl = useMemo(() => {
    return dailyData.reduce((sum, d) => sum + d.pnl, 0);
  }, [dailyData]);

  const monthTrades = useMemo(() => {
    return dailyData.reduce((sum, d) => sum + d.trades, 0);
  }, [dailyData]);

  const monthDaysWithData = dailyData.filter((d) => d.trades > 0).length;

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  async function handleDayClick(day: DayData) {
    setSelectedDay(day);
    try {
      const from = day.date;
      const to = day.date + "T23:59:59";
      const res = await getTrades({ from, to, limit: 100 });
      setDayTrades(res.data);
    } catch (err) {
      console.error(err);
      setDayTrades([]);
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
            CALENDAR HEATMAP
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "var(--text-dim)" }}>
            PERFORMANCE VISUALIZATION // DAILY P&L TRACKING
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={goToPrevMonth}
            className="bg-transparent border px-3 py-2 cursor-pointer text-xs rounded"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            ← PREV
          </button>
          <span className="text-sm font-bold tracking-widest min-w-[120px] md:min-w-[160px] text-center" style={{ color: "var(--text-primary)" }}>
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goToNextMonth}
            className="bg-transparent border px-3 py-2 cursor-pointer text-xs rounded"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            NEXT →
          </button>
        </div>
      </div>

      {/* Month Stats - 2 col mobile, 4 col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-6 rounded overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
        {[
          { label: "MONTH P&L", value: `${monthPnl >= 0 ? "+" : ""}${monthPnl.toLocaleString("en-US", { style: "currency", currency: "USD" })}`, color: monthPnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" },
          { label: "TOTAL TRADES", value: `${monthTrades}`, color: "var(--text-primary)" },
          { label: "ACTIVE DAYS", value: `${monthDaysWithData}`, color: "var(--text-primary)" },
          { label: "WIN RATE (DAYS)", value: `${dailyData.length > 0 ? Math.round((dailyData.filter((d) => d.pnl > 0).length / Math.max(dailyData.filter((d) => d.trades > 0).length, 1)) * 100) : 0}%`, color: "var(--text-primary)" },
        ].map((s) => (
          <div key={s.label} className="p-4 md:p-5" style={{ backgroundColor: "var(--bg-surface)" }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>{s.label}</div>
            <div className="text-lg md:text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="border rounded p-3 md:p-5" style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)" }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs tracking-widest font-bold py-2" style={{ color: "var(--text-dim)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-[40px] md:min-h-[60px]" />;
            }

            const dayData = dailyData.find((d) => d.date === day.date) || day;
            const intensity = getHeatIntensity(dayData.pnl, maxPnl);
            const isToday = day.date === now.toISOString().split("T")[0];
            const hasTrades = dayData.trades > 0;

            return (
              <div
                key={day.date}
                onClick={() => hasTrades && handleDayClick(dayData)}
                className="min-h-[40px] md:min-h-[60px] rounded p-1.5 md:p-2 relative transition-opacity cursor-default"
                style={{
                  background: hasTrades ? getPnLColor(dayData.pnl) : "var(--bg-primary)",
                  opacity: hasTrades ? 0.3 + intensity * 0.7 : 0.3,
                  cursor: hasTrades ? "pointer" : "default",
                  border: isToday ? "2px solid var(--text-primary)" : "1px solid transparent",
                }}
              >
                <div className="text-xs md:text-sm font-bold" style={{ color: hasTrades ? "var(--text-primary)" : "var(--text-dim)" }}>
                  {parseInt(day.date.split("-")[2], 10)}
                </div>
                {hasTrades && (
                  <div className="hidden md:block text-xs mt-1" style={{ color: "var(--text-primary)", opacity: 0.8 }}>
                    {dayData.pnl > 0 ? "+" : ""}{dayData.pnl.toFixed(0)}
                  </div>
                )}
                {hasTrades && (
                  <div className="hidden md:block text-xs" style={{ color: "var(--text-primary)", opacity: 0.6 }}>
                    {dayData.trades} trade{dayData.trades !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Panel - bottom sheet on mobile, side panel on desktop */}
      {selectedDay && (
        <>
          {/* Mobile overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSelectedDay(null)}
          />

          {/* Mobile bottom sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 md:hidden rounded-t-xl max-h-[80vh] overflow-y-auto p-5" style={{ backgroundColor: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-base font-bold m-0">
                  {new Date(selectedDay.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
                  {selectedDay.trades} TRADE{selectedDay.trades !== 1 ? "S" : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="bg-transparent border px-3 py-1.5 cursor-pointer text-xs rounded"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
              >
                CLOSE
              </button>
            </div>

            <div className="mb-5">
              <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>DAILY P&L</div>
              <div className="text-2xl font-bold" style={{ color: selectedDay.pnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                {selectedDay.pnl >= 0 ? "+" : ""}{selectedDay.pnl.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {dayTrades.map((trade) => {
                const isWin = Number(trade.pnl) >= 0;
                return (
                  <div key={trade.id} className="border rounded p-3" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)" }}>
                    <div className="flex justify-between mb-2">
                      <span className="font-bold text-sm">{trade.symbol}</span>
                      <span className="font-bold text-sm" style={{ color: isWin ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                        {isWin ? "+" : ""}{Number(trade.pnl).toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <div><span style={{ color: "var(--text-dim)" }}>SIDE:</span> {trade.direction === "buy" ? "LONG" : "SHORT"}</div>
                      <div><span style={{ color: "var(--text-dim)" }}>ENTRY:</span> {trade.entry_price}</div>
                      <div><span style={{ color: "var(--text-dim)" }}>EXIT:</span> {trade.exit_price}</div>
                      <div><span style={{ color: "var(--text-dim)" }}>STRATEGY:</span> {trade.strategy || "N/A"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop side panel */}
          <div
            className="hidden md:block fixed top-0 right-0 w-[400px] h-screen border-l p-6 overflow-y-auto z-50"
            style={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)" }}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-base font-bold m-0">
                  {new Date(selectedDay.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
                  {selectedDay.trades} TRADE{selectedDay.trades !== 1 ? "S" : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="bg-transparent border px-4 py-2 cursor-pointer text-xs rounded"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
              >
                CLOSE
              </button>
            </div>

            <div className="mb-5">
              <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>DAILY P&L</div>
              <div className="text-3xl font-bold" style={{ color: selectedDay.pnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                {selectedDay.pnl >= 0 ? "+" : ""}{selectedDay.pnl.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {dayTrades.map((trade) => {
                const isWin = Number(trade.pnl) >= 0;
                return (
                  <div key={trade.id} className="border rounded p-3" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)" }}>
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">{trade.symbol}</span>
                      <span className="font-bold" style={{ color: isWin ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                        {isWin ? "+" : ""}{Number(trade.pnl).toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <div><span style={{ color: "var(--text-dim)" }}>SIDE:</span> {trade.direction === "buy" ? "LONG" : "SHORT"}</div>
                      <div><span style={{ color: "var(--text-dim)" }}>ENTRY:</span> {trade.entry_price}</div>
                      <div><span style={{ color: "var(--text-dim)" }}>EXIT:</span> {trade.exit_price}</div>
                      <div><span style={{ color: "var(--text-dim)" }}>STRATEGY:</span> {trade.strategy || "N/A"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 items-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "var(--accent-loss)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>LOSS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>NO TRADES</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "var(--accent-profit)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>PROFIT</span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>
          OPACITY INDICATES P&L MAGNITUDE
        </span>
      </div>
    </div>
  );
}
