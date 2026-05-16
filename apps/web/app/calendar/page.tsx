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
  if (pnl > 0) return "#22c55e";
  if (pnl < 0) return "#ef4444";
  return "#2a2a2a";
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

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "#111111",
    color: "#ffffff",
    fontFamily: "monospace",
    padding: "24px",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  };

  const statsStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1px",
    marginBottom: "24px",
    backgroundColor: "#2a2a2a",
  };

  const statCardStyle: React.CSSProperties = {
    backgroundColor: "#1c1c1c",
    padding: "20px",
  };

  const calendarGridStyle: React.CSSProperties = {
    backgroundColor: "#1c1c1c",
    border: "1px solid #2a2a2a",
    borderRadius: "4px",
    padding: "20px",
  };

  const dayHeaderStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    marginBottom: "8px",
  };

  const calendarDaysStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>
            CALENDAR HEATMAP
          </h1>
          <p style={{ fontSize: "11px", color: "#555", margin: "4px 0 0", letterSpacing: "0.05em" }}>
            PERFORMANCE VISUALIZATION // DAILY P&L TRACKING
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={goToPrevMonth}
            style={{
              background: "transparent",
              border: "1px solid #2a2a2a",
              color: "#888",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            ← PREV
          </button>
          <span style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", color: "#fff", minWidth: "160px", textAlign: "center" }}>
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goToNextMonth}
            style={{
              background: "transparent",
              border: "1px solid #2a2a2a",
              color: "#888",
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            NEXT →
          </button>
        </div>
      </div>

      {/* Month Stats */}
      <div style={statsStyle}>
        <div style={statCardStyle}>
          <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.12em", marginBottom: "8px" }}>
            MONTH P&L
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: monthPnl >= 0 ? "#22c55e" : "#ef4444" }}>
            {monthPnl >= 0 ? "+" : ""}{monthPnl.toLocaleString("en-US", { style: "currency", currency: "USD" })}
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.12em", marginBottom: "8px" }}>
            TOTAL TRADES
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{monthTrades}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.12em", marginBottom: "8px" }}>
            ACTIVE DAYS
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{monthDaysWithData}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.12em", marginBottom: "8px" }}>
            WIN RATE (DAYS)
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
            {dailyData.length > 0 ? Math.round((dailyData.filter((d) => d.pnl > 0).length / Math.max(dailyData.filter((d) => d.trades > 0).length, 1)) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={calendarGridStyle}>
        {/* Day headers */}
        <div style={dayHeaderStyle}>
          {dayNames.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: "10px", color: "#555", letterSpacing: "0.1em", fontWeight: 700, padding: "8px 0" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div style={calendarDaysStyle}>
          {monthDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} style={{ minHeight: "60px" }} />;
            }

            const dayData = dailyData.find((d) => d.date === day.date) || day;
            const intensity = getHeatIntensity(dayData.pnl, maxPnl);
            const isToday = day.date === now.toISOString().split("T")[0];
            const hasTrades = dayData.trades > 0;

            return (
              <div
                key={day.date}
                onClick={() => hasTrades && handleDayClick(dayData)}
                style={{
                  minHeight: "60px",
                  background: hasTrades ? getPnLColor(dayData.pnl) : "#111",
                  opacity: hasTrades ? 0.3 + intensity * 0.7 : 0.3,
                  borderRadius: "4px",
                  padding: "8px",
                  cursor: hasTrades ? "pointer" : "default",
                  position: "relative",
                  border: isToday ? "2px solid #fff" : "1px solid transparent",
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 700, color: hasTrades ? "#fff" : "#555" }}>
                  {parseInt(day.date.split("-")[2], 10)}
                </div>
                {hasTrades && (
                  <div style={{ fontSize: "9px", color: "#fff", opacity: 0.8, marginTop: "4px" }}>
                    {dayData.pnl > 0 ? "+" : ""}{dayData.pnl.toFixed(0)}
                  </div>
                )}
                {hasTrades && (
                  <div style={{ fontSize: "9px", color: "#fff", opacity: 0.6 }}>
                    {dayData.trades} trade{dayData.trades !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDay && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "400px",
            height: "100vh",
            backgroundColor: "#1c1c1c",
            borderLeft: "1px solid #2a2a2a",
            padding: "24px",
            overflowY: "auto",
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>
                {new Date(selectedDay.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h2>
              <p style={{ fontSize: "11px", color: "#555", margin: "4px 0 0" }}>
                {selectedDay.trades} TRADE{selectedDay.trades !== 1 ? "S" : ""}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              style={{
                background: "transparent",
                border: "1px solid #2a2a2a",
                color: "#888",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
            >
              CLOSE
            </button>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.12em", marginBottom: "8px" }}>
              DAILY P&L
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: selectedDay.pnl >= 0 ? "#22c55e" : "#ef4444" }}>
              {selectedDay.pnl >= 0 ? "+" : ""}{selectedDay.pnl.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </div>
          </div>

          {/* Trades for this day */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {dayTrades.map((trade) => {
              const isWin = Number(trade.pnl) >= 0;
              return (
                <div
                  key={trade.id}
                  style={{
                    backgroundColor: "#111",
                    border: "1px solid #2a2a2a",
                    borderRadius: "4px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontWeight: 700 }}>{trade.symbol}</span>
                    <span style={{ color: isWin ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
                      {isWin ? "+" : ""}{Number(trade.pnl).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", color: "#888" }}>
                    <div>
                      <span style={{ color: "#555" }}>SIDE:</span> {trade.direction === "buy" ? "LONG" : "SHORT"}
                    </div>
                    <div>
                      <span style={{ color: "#555" }}>ENTRY:</span> {trade.entry_price}
                    </div>
                    <div>
                      <span style={{ color: "#555" }}>EXIT:</span> {trade.exit_price}
                    </div>
                    <div>
                      <span style={{ color: "#555" }}>STRATEGY:</span> {trade.strategy || "N/A"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          marginTop: "16px",
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "16px", height: "16px", backgroundColor: "#ef4444", borderRadius: "2px" }} />
          <span style={{ fontSize: "11px", color: "#888" }}>LOSS</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "16px", height: "16px", backgroundColor: "#2a2a2a", borderRadius: "2px" }} />
          <span style={{ fontSize: "11px", color: "#888" }}>NO TRADES</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "16px", height: "16px", backgroundColor: "#22c55e", borderRadius: "2px" }} />
          <span style={{ fontSize: "11px", color: "#888" }}>PROFIT</span>
        </div>
        <span style={{ fontSize: "10px", color: "#555", marginLeft: "16px" }}>
          OPACITY INDICATES P&L MAGNITUDE
        </span>
      </div>
    </div>
  );
}