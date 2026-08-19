"use client";
import { useEffect, useState, useMemo } from "react";
import { getDailyPnl, getTrades, getMarketNews } from "@/lib/api";
import DashboardShell from "@/components/DashboardShell";
import {
  IMPACT_COLORS,
  formatEventTime,
  isPastEvent,
  isSpeech,
  type MarketNewsEvent,
} from "@/lib/news";

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
  for (let i = 0; i < startDayOfWeek; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      pnl: 0,
      trades: 0,
    });
  }
  return days;
}

function getHeatStyle(
  pnl: number,
  maxPnl: number,
  hasTrades: boolean,
): React.CSSProperties {
  if (!hasTrades) {
    return { background: "var(--bg-primary)", opacity: 1 };
  }
  const intensity = maxPnl === 0 ? 0 : Math.min(Math.abs(pnl) / maxPnl, 1);
  const alpha = 0.25 + intensity * 0.6;
  if (pnl > 0) {
    return { background: `rgba(34, 197, 94, ${alpha})` };
  }
  return { background: `rgba(239, 68, 68, ${alpha})` };
}

const monthNames = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function CalendarPage() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [dailyData, setDailyData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [dayTrades, setDayTrades] = useState<any[]>([]);
  const [news, setNews] = useState<MarketNewsEvent[]>([]);

  useEffect(() => {
    const firstDay = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const lastDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${lastDay}`;

    Promise.all([
      getDailyPnl(firstDay, lastDayStr),
      getTrades({ from: firstDay, to: `${lastDayStr}T23:59:59`, limit: 1000 }),
    ])
      .then(([dailyRes, tradesRes]) => {
        const dayMap: Record<string, { pnl: number; trades: any[] }> = {};
        tradesRes.data.forEach((t: any) => {
          const rawDate = t.trade_date || t.created_at;
          const date =
            rawDate instanceof Date
              ? rawDate.toISOString().split("T")[0]
              : rawDate?.split("T")[0];
          if (
            date &&
            date.startsWith(
              `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`,
            )
          ) {
            if (!dayMap[date]) dayMap[date] = { pnl: 0, trades: [] };
            dayMap[date].pnl += Number(t.pnl);
            dayMap[date].trades.push(t);
          }
        });
        const merged = new Map<string, DayData>();
        for (const d of dailyRes) {
          const rawDate =
            typeof d.date === "string" ? d.date : d.date.toISOString();
          const dateStr = rawDate.split("T")[0];
          merged.set(dateStr, {
            date: dateStr,
            pnl: dayMap[dateStr]?.pnl ?? Number(d.totalPnl ?? 0),
            trades:
              dayMap[dateStr]?.trades?.length ?? Number(d.tradeCount ?? 0),
          });
        }
        for (const [dateStr, entry] of Object.entries(dayMap)) {
          if (!merged.has(dateStr)) {
            merged.set(dateStr, {
              date: dateStr,
              pnl: entry.pnl,
              trades: entry.trades.length,
            });
          }
        }
        setDailyData(
          Array.from(merged.values()).sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        );
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [currentYear, currentMonth]);

  useEffect(() => {
    const abort = new AbortController();
    getMarketNews(abort.signal)
      .then((data) => {
        setNews(
          data
            .filter((e) => !isPastEvent(e) && !isSpeech(e.title))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 10),
        );
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);

  const monthDays = useMemo(
    () => getMonthDays(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  const maxPnl = useMemo(
    () => Math.max(...dailyData.map((d) => Math.abs(d.pnl)), 1),
    [dailyData],
  );
  const monthPnl = useMemo(
    () => dailyData.reduce((sum, d) => sum + d.pnl, 0),
    [dailyData],
  );
  const monthTrades = useMemo(
    () => dailyData.reduce((sum, d) => sum + d.trades, 0),
    [dailyData],
  );
  const monthDaysWithData = dailyData.filter((d) => d.trades > 0).length;
  const winRateDays =
    (dailyData.filter((d) => d.pnl > 0).length /
      Math.max(dailyData.filter((d) => d.trades > 0).length, 1)) *
    100;

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
      const res = await getTrades({
        from: day.date,
        to: day.date + "T23:59:59",
        limit: 100,
      });
      setDayTrades(res.data);
    } catch {
      setDayTrades([]);
    }
  }

  return (
    <DashboardShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
            CALENDAR HEATMAP
          </h1>
          <p className="text-xs mt-1 tracking-wide text-text-dim">
            PERFORMANCE VISUALIZATION // DAILY P&L TRACKING
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={goToPrevMonth}
            className="bg-transparent border text-text-muted px-3 py-2 cursor-pointer text-xs rounded"
            style={{ borderColor: "var(--border)" }}
          >
            ← PREV
          </button>
          <span className="text-sm font-bold tracking-widest text-text-primary min-w-[120px] md:min-w-[160px] text-center">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goToNextMonth}
            className="bg-transparent border text-text-muted px-3 py-2 cursor-pointer text-xs rounded"
            style={{ borderColor: "var(--border)" }}
          >
            NEXT →
          </button>
        </div>
      </div>

      {/* Month Stats */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-6 rounded overflow-hidden"
        style={{ background: "var(--border)" }}
      >
        {[
          {
            label: "MONTH P&L",
            value: `${monthPnl >= 0 ? "+" : ""}${monthPnl.toLocaleString("en-US", { style: "currency", currency: "USD" })}`,
            color:
              monthPnl >= 0 ? "var(--accent-profit)" : "var(--accent-loss)",
          },
          {
            label: "TOTAL TRADES",
            value: `${monthTrades}`,
            color: "var(--text-primary)",
          },
          {
            label: "ACTIVE DAYS",
            value: `${monthDaysWithData}`,
            color: "var(--text-primary)",
          },
          {
            label: "WIN RATE (DAYS)",
            value: `${isNaN(winRateDays) ? 0 : Math.round(winRateDays)}%`,
            color: "var(--text-primary)",
          },
        ].map((s) => (
          <div key={s.label} className="p-4 md:p-5 surface-0">
            <div className="text-xs tracking-widest mb-2 text-text-muted">
              {s.label}
            </div>
            <div
              className="text-lg md:text-2xl font-bold"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="surface-2 rounded-xl p-3 md:p-5">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((d) => (
            <div
              key={d}
              className="text-center text-xs tracking-widest font-bold py-2 text-text-dim"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day, idx) => {
            if (!day)
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[40px] md:min-h-[60px]"
                />
              );

            const dayData = dailyData.find((d) => d.date === day.date) || day;
            const isToday = day.date === now.toISOString().split("T")[0];
            const hasTrades = dayData.trades > 0;

            return (
              <div
                key={day.date}
                onClick={() => hasTrades && handleDayClick(dayData)}
                className="min-h-[40px] md:min-h-[60px] rounded p-1.5 md:p-2"
                style={{
                  ...getHeatStyle(dayData.pnl, maxPnl, hasTrades),
                  cursor: hasTrades ? "pointer" : "default",
                  border: isToday
                    ? "2px solid var(--accent-profit)"
                    : hasTrades
                      ? "1px solid rgba(255,255,255,0.08)"
                      : "1px solid transparent",
                }}
              >
                <div
                  className={`text-xs md:text-sm font-bold ${hasTrades ? "text-white" : "text-text-dim"}`}
                  style={{
                    textShadow: hasTrades
                      ? "0 1px 3px rgba(0,0,0,0.5)"
                      : "none",
                  }}
                >
                  {parseInt(day.date.split("-")[2], 10)}
                </div>
                {hasTrades && (
                  <>
                    <div
                      className="hidden md:block text-xs mt-0.5 text-white/90"
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                    >
                      {dayData.pnl > 0 ? "+" : ""}
                      {dayData.pnl.toFixed(0)}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming News */}
      {news.length > 0 && (
        <div className="surface-2 rounded-xl p-3 md:p-5 mt-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold tracking-widest m-0">
              UPCOMING NEWS
            </h2>
            <a
              href="https://www.forexfactory.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-dim hover:text-text-primary no-underline"
            >
              FULL CALENDAR →
            </a>
          </div>
          <div className="flex flex-col">
            {news.map((event, i) => {
              const colors = IMPACT_COLORS[event.impact] ?? IMPACT_COLORS.low;
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 py-2.5"
                  style={{
                    borderBottom:
                      i < news.length - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                >
                  <div
                    className="w-1 self-stretch rounded"
                    style={{ backgroundColor: colors.bar }}
                  />
                  <div className="text-sm font-bold text-text-primary w-14 shrink-0">
                    {formatEventTime(event.timestamp || event.date)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{event.title}</div>
                    <div className="text-xs text-text-dim">
                      {event.currency || event.country} ·{" "}
                      {event.impact === "high" ? "High" : "Medium"} impact
                    </div>
                  </div>
                  <div className="hidden md:flex gap-4 text-xs text-text-dim shrink-0">
                    <span>
                      FCST <span className="text-text-primary">{event.forecast || "—"}</span>
                    </span>
                    <span>
                      PREV <span className="text-text-primary">{event.previous || "—"}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Detail Panel */}
      {selectedDay && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSelectedDay(null)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 md:hidden rounded-t-xl max-h-[80vh] overflow-y-auto p-5 surface-1 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <DayDetailHeader
              selectedDay={selectedDay}
              onClose={() => setSelectedDay(null)}
              dayTrades={dayTrades}
            />
          </div>
          <div
            className="hidden md:block fixed top-0 right-0 w-[400px] h-screen border-l p-6 overflow-y-auto z-50 surface-1"
            style={{ borderColor: "var(--border)" }}
          >
            <DayDetailHeader
              selectedDay={selectedDay}
              onClose={() => setSelectedDay(null)}
              dayTrades={dayTrades}
              desktop
            />
          </div>
        </>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 md:gap-6 items-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-loss" />
          <span className="text-xs text-text-muted">LOSS</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-border" />
          <span className="text-xs text-text-muted">NO TRADES</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-profit" />
          <span className="text-xs text-text-muted">PROFIT</span>
        </div>
        <span className="text-xs text-text-dim">
          OPACITY INDICATES P&L MAGNITUDE
        </span>
      </div>
    </DashboardShell>
  );
}

function DayDetailHeader({
  selectedDay,
  onClose,
  dayTrades,
  desktop,
}: {
  selectedDay: DayData;
  onClose: () => void;
  dayTrades: any[];
  desktop?: boolean;
}) {
  return (
    <>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h2
            className={`font-bold m-0 ${desktop ? "text-base" : "text-base"}`}
          >
            {new Date(selectedDay.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <p className="text-xs mt-1 text-text-dim">
            {selectedDay.trades} TRADE{selectedDay.trades !== 1 ? "S" : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="bg-transparent border text-text-muted px-3 py-1.5 cursor-pointer text-xs rounded"
          style={{ borderColor: "var(--border)" }}
        >
          CLOSE
        </button>
      </div>
      <div className="mb-5">
        <div className="text-xs tracking-widest mb-2 text-text-muted">
          DAILY P&L
        </div>
        <div
          className={`${desktop ? "text-3xl" : "text-2xl"} font-bold`}
          style={{
            color:
              selectedDay.pnl >= 0
                ? "var(--accent-profit)"
                : "var(--accent-loss)",
          }}
        >
          {selectedDay.pnl >= 0 ? "+" : ""}
          {selectedDay.pnl.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {dayTrades.map((trade) => {
          const isWin = Number(trade.pnl) >= 0;
          return (
            <div
              key={trade.id}
              className="border rounded p-3 surface-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex justify-between mb-2">
                <span className="font-bold text-sm">{trade.symbol}</span>
                <span
                  className="font-bold text-sm"
                  style={{
                    color: isWin
                      ? "var(--accent-profit)"
                      : "var(--accent-loss)",
                  }}
                >
                  {isWin ? "+" : ""}
                  {Number(trade.pnl).toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                <div>
                  <span className="text-text-dim">SIDE:</span>{" "}
                  {trade.direction === "buy" ? "LONG" : "SHORT"}
                </div>
                <div>
                  <span className="text-text-dim">ENTRY:</span>{" "}
                  {trade.entry_price}
                </div>
                <div>
                  <span className="text-text-dim">EXIT:</span>{" "}
                  {trade.exit_price}
                </div>
                <div>
                  <span className="text-text-dim">STRATEGY:</span>{" "}
                  {trade.strategy || "N/A"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
