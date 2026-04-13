"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTrade, uploadTradeImage } from "@/lib/api";

function RRDisplay({ entry, stopLoss, takeProfit }: { entry: string; stopLoss: string; takeProfit: string }) {
  const e = parseFloat(entry);
  const sl = parseFloat(stopLoss);
  const tp = parseFloat(takeProfit);
  if (!e || !sl || !tp || Math.abs(e - sl) === 0) return <span style={{ color: "#555" }}>--</span>;
  const risk = Math.abs(e - sl);
  const reward = Math.abs(tp - e);
  const rr = reward / risk;
  const riskAmt = risk;
  const maxReward = reward;
  return (
    <div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: rr >= 2 ? "#22c55e" : rr >= 1 ? "#e8603c" : "#ef4444" }}>
        1:{rr.toFixed(2)}
      </div>
      <div style={{ fontSize: "11px", color: "#888", marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <span>RISK AMT: <span style={{ color: "#fff" }}>{riskAmt.toFixed(4)}</span></span>
        <span>MAX REWARD: <span style={{ color: "#22c55e" }}>{maxReward.toFixed(4)}</span></span>
      </div>
    </div>
  );
}

function TogglePill({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "6px 0",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "18px",
          borderRadius: "9px",
          backgroundColor: value ? "#ffffff" : "#333333",
          position: "relative",
          transition: "background-color 0.15s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "3px",
            left: value ? "17px" : "3px",
            width: "12px",
            height: "12px",
            borderRadius: "6px",
            backgroundColor: value ? "#111111" : "#888888",
            transition: "left 0.15s",
          }}
        />
      </div>
      <span style={{ fontSize: "11px", letterSpacing: "0.1em", color: value ? "#ffffff" : "#888888" }}>
        {label}
      </span>
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "#111111",
  border: "1px solid #2a2a2a",
  borderRadius: "4px",
  padding: "10px 12px",
  color: "#ffffff",
  fontFamily: "monospace",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "#888",
  letterSpacing: "0.12em",
  marginBottom: "6px",
  display: "block",
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: "#1c1c1c",
  border: "1px solid #2a2a2a",
  borderRadius: "4px",
  padding: "20px",
  marginBottom: "16px",
};

export default function AddTradePage() {
  const router = useRouter();

  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [strategy, setStrategy] = useState("");
  const [notes, setNotes] = useState("");
  const [fomoCheck, setFomoCheck] = useState(false);
  const [trendAlignment, setTrendAlignment] = useState(false);
  const [vengeanceTrade, setVengeanceTrade] = useState(false);
  const [commission, setCommission] = useState("");
  const [contractSize, setContractSize] = useState("100000");
  const [applyRiskShield, setApplyRiskShield] = useState(false);
  const [utcTime, setUtcTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [tradeDate, setTradeDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [tradeTime, setTradeTime] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(11, 16);
  });
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChartFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setChartImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const h = now.getUTCHours().toString().padStart(2, "0");
      const m = now.getUTCMinutes().toString().padStart(2, "0");
      const s = now.getUTCSeconds().toString().padStart(2, "0");
      setUtcTime(`${h}:${m}:${s} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!symbol.trim()) {
      setError("INSTRUMENT TICKER is required.");
      return;
    }
    if (!entry || !exit || !quantity) {
      setError("Entry price, exit price, and quantity are required.");
      return;
    }

    setSubmitting(true);
    try {
      const trade = await createTrade({
        symbol: symbol.trim().toUpperCase(),
        direction: direction === "LONG" ? "buy" : "sell",
        entry: parseFloat(entry),
        exit: parseFloat(exit),
        lot: parseFloat(quantity),
        contract_size: parseFloat(contractSize) || 100000,
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
        strategy: strategy.trim() || undefined,
        notes: notes.trim() || undefined,
        fomo_check: fomoCheck,
        trend_alignment: trendAlignment,
        vengeance_trade: vengeanceTrade,
        trade_date: tradeDate && tradeTime ? `${tradeDate}T${tradeTime}:00Z` : undefined,
        commission: commission ? parseFloat(commission) : undefined,
      });
      if (chartFile && trade?.id) {
        await uploadTradeImage(trade.id, chartFile);
      }
      router.push("/trades");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#111111", color: "#ffffff", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>
            LOG NEW EXECUTION
          </h1>
          <p style={{ fontSize: "11px", color: "#555", margin: "4px 0 0", letterSpacing: "0.05em" }}>
            ENTRY_PROTOCOL // COMMIT TO LEDGER
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: "11px", color: "#888" }}>
          <div style={{ letterSpacing: "0.1em" }}>SYSTEM CLOCK</div>
          <div style={{ fontSize: "16px", color: "#fff", fontWeight: 700, marginTop: "2px", letterSpacing: "0.05em" }}>
            {utcTime}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px" }}>
          {/* Left column */}
          <div>
            {/* Section 01: Instrument */}
            <div style={sectionStyle}>
              <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", marginBottom: "16px" }}>
                01 // INSTRUMENT PARAMETERS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={labelStyle}>INSTRUMENT TICKER</label>
                  <input
                    style={inputStyle}
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="e.g. BTCUSD"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label style={labelStyle}>DIRECTION</label>
                  <div style={{ display: "flex", gap: "0" }}>
                    {(["LONG", "SHORT"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDirection(d)}
                        style={{
                          flex: 1,
                          padding: "10px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          border: "1px solid #2a2a2a",
                          cursor: "pointer",
                          backgroundColor: direction === d ? (d === "LONG" ? "#ffffff" : "#ef4444") : "#111111",
                          color: direction === d ? (d === "LONG" ? "#000000" : "#ffffff") : "#888888",
                          borderRadius: d === "LONG" ? "4px 0 0 4px" : "0 4px 4px 0",
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={labelStyle}>ENTRY PRICE</label>
                  <input style={inputStyle} type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="0.00000" />
                </div>
                <div>
                  <label style={labelStyle}>EXIT PRICE</label>
                  <input style={inputStyle} type="number" step="any" value={exit} onChange={(e) => setExit(e.target.value)} placeholder="0.00000" />
                </div>
                <div>
                  <label style={labelStyle}>QUANTITY / LOT SIZE</label>
                  <input style={inputStyle} type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.01" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={labelStyle}>CONTRACT SIZE</label>
                  <select
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={contractSize}
                    onChange={(e) => setContractSize(e.target.value)}
                  >
                    <option value="100000">100,000 (Standard Lot)</option>
                    <option value="10000">10,000 (Mini Lot)</option>
                    <option value="1000">1,000 (Micro Lot)</option>
                    <option value="1">1 (Stocks / Crypto)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>STOP LOSS</label>
                  <input style={inputStyle} type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="0.00000" />
                </div>
                <div>
                  <label style={labelStyle}>TAKE PROFIT</label>
                  <input style={inputStyle} type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="0.00000" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                <div>
                  <label style={labelStyle}>COMMISSION / FEES</label>
                  <input style={inputStyle} type="number" step="any" min="0" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>TRADE DATE</label>
                  <input style={{ ...inputStyle, colorScheme: "dark" }} type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>TRADE TIME (UTC)</label>
                  <input style={{ ...inputStyle, colorScheme: "dark" }} type="time" value={tradeTime} onChange={(e) => setTradeTime(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Section 02: Strategy + Notes */}
            <div style={sectionStyle}>
              <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", marginBottom: "16px" }}>
                02 // EXECUTION METADATA
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={labelStyle}>STRATEGY TAG</label>
                <input
                  style={inputStyle}
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  placeholder="e.g. BREAKOUT, REVERSAL, SMC..."
                />
              </div>
              <div>
                <label style={labelStyle}>TRADE NOTES</label>
                <textarea
                  style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your rationale, setup context, market conditions..."
                />
              </div>

              {/* Chart Image */}
              <div style={{ marginTop: "12px" }}>
                <label style={labelStyle}>CHART SCREENSHOT</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  style={{
                    background: "transparent",
                    border: "1px dashed #2a2a2a",
                    borderRadius: "4px",
                    color: "#888",
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    padding: "10px 20px",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#555"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLButtonElement).style.color = "#888"; }}
                >
                  + ADD IMAGE
                </button>
                {chartImage && (
                  <div style={{ marginTop: "12px", position: "relative", display: "inline-block" }}>
                    <img
                      src={chartImage}
                      alt="Chart screenshot"
                      style={{ maxWidth: "100%", maxHeight: "300px", border: "1px solid #2a2a2a", borderRadius: "4px", display: "block" }}
                    />
                    <button
                      type="button"
                      onClick={() => { setChartImage(null); setChartFile(null); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        background: "rgba(0,0,0,0.7)",
                        border: "1px solid #444",
                        borderRadius: "4px",
                        color: "#fff",
                        cursor: "pointer",
                        fontFamily: "monospace",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        padding: "4px 8px",
                      }}
                    >
                      REMOVE
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Section 03: Behavioral flags */}
            <div style={sectionStyle}>
              <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", marginBottom: "16px" }}>
                03 // BEHAVIORAL FLAGS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <TogglePill label="FOMO ENTRY — entered without valid setup confirmation" value={fomoCheck} onChange={setFomoCheck} />
                <TogglePill label="TREND ALIGNMENT — trade aligns with higher-timeframe bias" value={trendAlignment} onChange={setTrendAlignment} />
                <TogglePill label="VENGEANCE TRADE — entered to recover from previous loss" value={vengeanceTrade} onChange={setVengeanceTrade} />
              </div>
            </div>
          </div>

          {/* Right column: RR panel */}
          <div>
            <div style={{ ...sectionStyle, position: "sticky", top: "40px" }}>
              <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", marginBottom: "16px" }}>
                LIVE R:R CALCULATOR
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.1em", marginBottom: "8px" }}>
                  RISK/REWARD RATIO
                </div>
                <RRDisplay entry={entry} stopLoss={stopLoss} takeProfit={takeProfit} />
              </div>

              {/* Profit & Loss */}
              <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: "16px", marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", color: "#888", letterSpacing: "0.1em", marginBottom: "8px" }}>
                  ESTIMATED P&L
                </div>
                {(() => {
                  const e = parseFloat(entry);
                  const x = parseFloat(exit);
                  const q = parseFloat(quantity);
                  const cs = parseFloat(contractSize) || 1;
                  if (!e || !x || !q) return <span style={{ fontSize: "28px", fontWeight: 700, color: "#555" }}>--</span>;
                  const rawPnl = direction === "LONG" ? (x - e) * q * cs : (e - x) * q * cs;
                  const comm = parseFloat(commission) || 0;
                  const pnl = rawPnl - comm;
                  const isProfit = pnl >= 0;
                  const absPnl = Math.abs(pnl);
                  const decimals = absPnl > 0 && absPnl < 0.01 ? 5 : absPnl < 1 ? 4 : 2;
                  return (
                    <div>
                      <div style={{ fontSize: "28px", fontWeight: 700, color: isProfit ? "#22c55e" : "#ef4444" }}>
                        {isProfit ? "+" : ""}{pnl.toFixed(decimals)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                        {isProfit ? "PROFIT" : "LOSS"}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: "16px", marginBottom: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <div
                    onClick={() => setApplyRiskShield(!applyRiskShield)}
                    style={{
                      width: "32px",
                      height: "18px",
                      borderRadius: "9px",
                      backgroundColor: applyRiskShield ? "#ffffff" : "#333333",
                      position: "relative",
                      transition: "background-color 0.15s",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "3px",
                        left: applyRiskShield ? "17px" : "3px",
                        width: "12px",
                        height: "12px",
                        borderRadius: "6px",
                        backgroundColor: applyRiskShield ? "#111111" : "#888888",
                        transition: "left 0.15s",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "10px", letterSpacing: "0.08em", color: applyRiskShield ? "#fff" : "#888" }}>
                    APPLY RISK LIMIT SHIELD
                  </span>
                </label>
              </div>

              {/* Confidence bars */}
              <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: "16px" }}>
                <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.12em", marginBottom: "12px" }}>
                  CONFIDENCE METRICS
                </div>
                {[
                  { label: "SETUP QUALITY", pct: trendAlignment ? 80 : 40 },
                  { label: "RISK DISCIPLINE", pct: fomoCheck || vengeanceTrade ? 20 : stopLoss ? 85 : 50 },
                  { label: "PROTOCOL SCORE", pct: Math.round(((trendAlignment ? 1 : 0) + (!fomoCheck ? 1 : 0) + (!vengeanceTrade ? 1 : 0) + (stopLoss ? 1 : 0) + (takeProfit ? 1 : 0)) / 5 * 100) },
                ].map((bar) => (
                  <div key={bar.label} style={{ marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "10px", color: "#888" }}>{bar.label}</span>
                      <span style={{ fontSize: "10px", color: bar.pct >= 70 ? "#22c55e" : bar.pct >= 40 ? "#e8603c" : "#ef4444" }}>
                        {bar.pct}%
                      </span>
                    </div>
                    <div style={{ height: "3px", backgroundColor: "#2a2a2a", borderRadius: "2px" }}>
                      <div
                        style={{
                          height: "3px",
                          borderRadius: "2px",
                          width: `${bar.pct}%`,
                          backgroundColor: bar.pct >= 70 ? "#22c55e" : bar.pct >= 40 ? "#e8603c" : "#ef4444",
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            backgroundColor: "#1c1c1c",
            border: "1px solid #2a2a2a",
            borderRadius: "4px",
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
          }}
        >
          {error ? (
            <span style={{ fontSize: "12px", color: "#ef4444", letterSpacing: "0.05em" }}>{error}</span>
          ) : (
            <span style={{ fontSize: "11px", color: "#555", letterSpacing: "0.08em" }}>
              ALL FIELDS VALIDATED // READY TO COMMIT
            </span>
          )}
          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: submitting ? "#333" : "#ffffff",
              color: submitting ? "#888" : "#000000",
              border: "none",
              borderRadius: "4px",
              padding: "12px 32px",
              fontFamily: "monospace",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "background-color 0.15s",
            }}
          >
            {submitting ? "COMMITTING..." : "COMMIT EXECUTION"}
          </button>
        </div>
      </form>
    </div>
  );
}
