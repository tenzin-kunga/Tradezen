"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { createTrade, uploadTradeImage, tagTrade } from "@/lib/api";
import TagPicker from "@/components/TagPicker";
import type { Tag } from "@/components/TagPicker";

function RRDisplay({ entry, stopLoss, takeProfit }: { entry: string; stopLoss: string; takeProfit: string }) {
  const e = parseFloat(entry);
  const sl = parseFloat(stopLoss);
  const tp = parseFloat(takeProfit);
  if (!e || !sl || !tp || Math.abs(e - sl) === 0) return <span style={{ color: "var(--text-dim)" }}>--</span>;
  const risk = Math.abs(e - sl);
  const reward = Math.abs(tp - e);
  const rr = reward / risk;
  const riskAmt = risk;
  const maxReward = reward;
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold" style={{ color: rr >= 2 ? "var(--accent-profit)" : rr >= 1 ? "var(--accent-warn)" : "var(--accent-loss)" }}>
        1:{rr.toFixed(2)}
      </div>
      <div className="text-xs mt-2 flex flex-col gap-1" style={{ color: "var(--text-muted)" }}>
        <span>RISK AMT: <span style={{ color: "var(--text-primary)" }}>{riskAmt.toFixed(4)}</span></span>
        <span>MAX REWARD: <span style={{ color: "var(--accent-profit)" }}>{maxReward.toFixed(4)}</span></span>
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
      className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer py-1.5"
    >
      <div
        className="w-8 h-4.5 rounded-full relative transition-colors flex-shrink-0"
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          backgroundColor: value ? "var(--text-primary)" : "var(--border)",
        }}
      >
        <div
          className="absolute top-[3px] w-3 h-3 rounded-full transition-all"
          style={{
            left: value ? 17 : 3,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: value ? "var(--bg-primary)" : "var(--text-muted)",
          }}
        />
      </div>
      <span className="text-xs tracking-widest" style={{ color: value ? "var(--text-primary)" : "var(--text-muted)" }}>
        {label}
      </span>
    </button>
  );
}

export default function AddTradePage() {
  const router = useRouter();
  const { addToast } = useToast();

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
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
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
      if (trade?.id && selectedTags.length > 0) {
        await Promise.all(selectedTags.map((t) => tagTrade(t.id, trade.id)));
      }
      addToast("success", `Trade ${trade?.id?.slice(0, 8) || ""} created`);
      router.push("/trades");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed.");
      setSubmitting(false);
    }
  }

  const inputCls = "w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2.5 text-sm outline-none box-border focus:border-[var(--accent-cyan)]";
  const labelCls = "block text-xs tracking-widest mb-1.5";
  const sectionCls = "bg-[var(--bg-surface)] border border-[var(--border)] rounded p-4 md:p-5 mb-4";

  return (
    <div className="min-h-screen" style={{ color: "var(--text-primary)" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
            LOG NEW EXECUTION
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "var(--text-muted)" }}>
            ENTRY_PROTOCOL // COMMIT TO LEDGER
          </p>
        </div>
        <div className="text-right text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="tracking-widest">SYSTEM CLOCK</div>
          <div className="text-lg font-bold mt-1 tracking-wide" style={{ color: "var(--text-primary)" }}>
            {utcTime}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Main grid: single col mobile, 2 col desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* Left column */}
          <div>
            {/* Section 01: Instrument */}
            <div className={sectionCls}>
              <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                01 // INSTRUMENT PARAMETERS
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelCls}>INSTRUMENT TICKER</label>
                  <input className={inputCls} value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="e.g. BTCUSD" autoComplete="off" />
                </div>
                <div>
                  <label className={labelCls}>DIRECTION</label>
                  <div className="flex">
                    {(["LONG", "SHORT"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDirection(d)}
                        className="flex-1 py-2.5 font-mono text-xs font-bold tracking-widest border cursor-pointer"
                        style={{
                          borderColor: "var(--border)",
                          backgroundColor: direction === d ? (d === "LONG" ? "var(--text-primary)" : "var(--accent-loss)") : "var(--bg-primary)",
                          color: direction === d ? (d === "LONG" ? "var(--bg-primary)" : "var(--text-primary)") : "var(--text-muted)",
                          borderRadius: d === "LONG" ? "var(--radius-sm) 0 0 var(--radius-sm)" : "0 var(--radius-sm) var(--radius-sm) 0",
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={labelCls}>ENTRY PRICE</label>
                  <input className={inputCls} type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="0.00000" />
                </div>
                <div>
                  <label className={labelCls}>EXIT PRICE</label>
                  <input className={inputCls} type="number" step="any" value={exit} onChange={(e) => setExit(e.target.value)} placeholder="0.00000" />
                </div>
                <div>
                  <label className={labelCls}>QUANTITY / LOT SIZE</label>
                  <input className={inputCls} type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.01" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={labelCls}>CONTRACT SIZE</label>
                  <select className={`${inputCls} cursor-pointer`} value={contractSize} onChange={(e) => setContractSize(e.target.value)}>
                    <option value="100000">100,000 (Standard Lot)</option>
                    <option value="10000">10,000 (Mini Lot)</option>
                    <option value="1000">1,000 (Micro Lot)</option>
                    <option value="1">1 (Stocks / Crypto)</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>STOP LOSS</label>
                  <input className={inputCls} type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="0.00000" />
                </div>
                <div>
                  <label className={labelCls}>TAKE PROFIT</label>
                  <input className={inputCls} type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="0.00000" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>COMMISSION / FEES</label>
                  <input className={inputCls} type="number" step="any" min="0" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelCls}>TRADE DATE</label>
                  <input className={`${inputCls} dark:[color-scheme:dark]`} type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>TRADE TIME (UTC)</label>
                  <input className={`${inputCls} dark:[color-scheme:dark]`} type="time" value={tradeTime} onChange={(e) => setTradeTime(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Section 02: Strategy + Notes */}
            <div className={sectionCls}>
              <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                02 // EXECUTION METADATA
              </div>
              <div className="mb-3">
                <label className={labelCls}>STRATEGY TAG</label>
                <input className={inputCls} value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="e.g. BREAKOUT, REVERSAL, SMC..." />
              </div>
              <div className="mb-3">
                <label className={labelCls}>TAGS</label>
                <TagPicker selectedTags={selectedTags} onChange={setSelectedTags} />
              </div>
              <div>
                <label className={labelCls}>TRADE NOTES</label>
                <textarea
                  className={`${inputCls} min-h-[100px] resize-y`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your rationale, setup context, market conditions..."
                />
              </div>

              {/* Chart Image */}
              <div className="mt-3">
                <label className={labelCls}>CHART SCREENSHOT</label>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="bg-transparent border border-dashed rounded cursor-pointer font-mono text-xs font-bold tracking-widest px-5 py-2.5 transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                >
                  + ADD IMAGE
                </button>
                {chartImage && (
                  <div className="mt-3 relative inline-block">
                    <img src={chartImage} alt="Chart screenshot" className="max-w-full max-h-[200px] md:max-h-[300px] rounded block" style={{ border: "1px solid var(--border)" }} />
                    <button
                      type="button"
                      onClick={() => { setChartImage(null); setChartFile(null); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                      className="absolute top-1.5 right-1.5 bg-black/70 rounded font-mono text-xs font-bold tracking-wide px-2 py-1"
                      style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
                    >
                      REMOVE
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Section 03: Behavioral flags */}
            <div className={sectionCls}>
              <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                03 // BEHAVIORAL FLAGS
              </div>
              <div className="flex flex-col gap-1">
                <TogglePill label="FOMO ENTRY — entered without valid setup confirmation" value={fomoCheck} onChange={setFomoCheck} />
                <TogglePill label="TREND ALIGNMENT — trade aligns with higher-timeframe bias" value={trendAlignment} onChange={setTrendAlignment} />
                <TogglePill label="VENGEANCE TRADE — entered to recover from previous loss" value={vengeanceTrade} onChange={setVengeanceTrade} />
              </div>
            </div>
          </div>

          {/* Right column: RR panel - below on mobile, sticky sidebar on desktop */}
          <div>
            <div className={`${sectionCls} lg:sticky lg:top-10`}>
              <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                LIVE R:R CALCULATOR
              </div>
              <div className="mb-5">
                <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                  RISK/REWARD RATIO
                </div>
                <RRDisplay entry={entry} stopLoss={stopLoss} takeProfit={takeProfit} />
              </div>

              {/* Profit & Loss */}
              <div className="border-t pt-4 mb-5" style={{ borderColor: "var(--border)" }}>
                <div className="text-xs tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                  ESTIMATED P&L
                </div>
                {(() => {
                  const e = parseFloat(entry);
                  const x = parseFloat(exit);
                  const q = parseFloat(quantity);
                  const cs = parseFloat(contractSize) || 1;
                  if (!e || !x || !q) return <span className="text-3xl md:text-4xl font-bold" style={{ color: "var(--text-dim)" }}>--</span>;
                  const rawPnl = direction === "LONG" ? (x - e) * q * cs : (e - x) * q * cs;
                  const comm = parseFloat(commission) || 0;
                  const pnl = rawPnl - comm;
                  const isProfit = pnl >= 0;
                  const absPnl = Math.abs(pnl);
                  const decimals = absPnl > 0 && absPnl < 0.01 ? 5 : absPnl < 1 ? 4 : 2;
                  return (
                    <div>
                      <div className="text-3xl md:text-4xl font-bold" style={{ color: isProfit ? "var(--accent-profit)" : "var(--accent-loss)" }}>
                        {isProfit ? "+" : ""}{pnl.toFixed(decimals)}
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {isProfit ? "PROFIT" : "LOSS"}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="border-t pt-4 mb-5" style={{ borderColor: "var(--border)" }}>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setApplyRiskShield(!applyRiskShield)}
                    className="w-8 h-4.5 rounded-full relative transition-colors cursor-pointer flex-shrink-0"
                    style={{
                      width: 32,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: applyRiskShield ? "var(--text-primary)" : "var(--border)",
                    }}
                  >
                    <div
                      className="absolute top-[3px] w-3 h-3 rounded-full transition-all"
                      style={{
                        left: applyRiskShield ? 17 : 3,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: applyRiskShield ? "var(--bg-primary)" : "var(--text-muted)",
                      }}
                    />
                  </div>
                  <span className="text-xs tracking-wide" style={{ color: applyRiskShield ? "var(--text-primary)" : "var(--text-muted)" }}>
                    APPLY RISK LIMIT SHIELD
                  </span>
                </label>
              </div>

              {/* Confidence bars */}
              <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <div className="text-xs tracking-widest mb-3" style={{ color: "var(--text-dim)" }}>
                  CONFIDENCE METRICS
                </div>
                {[
                  { label: "SETUP QUALITY", pct: trendAlignment ? 80 : 40 },
                  { label: "RISK DISCIPLINE", pct: fomoCheck || vengeanceTrade ? 20 : stopLoss ? 85 : 50 },
                  { label: "PROTOCOL SCORE", pct: Math.round(((trendAlignment ? 1 : 0) + (!fomoCheck ? 1 : 0) + (!vengeanceTrade ? 1 : 0) + (stopLoss ? 1 : 0) + (takeProfit ? 1 : 0)) / 5 * 100) },
                ].map((bar) => (
                  <div key={bar.label} className="mb-2.5">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{bar.label}</span>
                      <span className="text-xs" style={{ color: bar.pct >= 70 ? "var(--accent-profit)" : bar.pct >= 40 ? "var(--accent-warn)" : "var(--accent-loss)" }}>
                        {bar.pct}%
                      </span>
                    </div>
                    <div className="h-[3px] rounded" style={{ backgroundColor: "var(--border)" }}>
                      <div
                        className="h-[3px] rounded transition-all"
                        style={{
                          width: `${bar.pct}%`,
                          backgroundColor: bar.pct >= 70 ? "var(--accent-profit)" : bar.pct >= 40 ? "var(--accent-warn)" : "var(--accent-loss)",
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
          className="rounded p-4 md:px-5 md:py-4 flex flex-col sm:flex-row justify-between items-center gap-3 mt-4"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          {error ? (
            <span className="text-sm tracking-wide" style={{ color: "var(--accent-loss)" }}>{error}</span>
          ) : (
            <span className="text-xs tracking-wide" style={{ color: "var(--text-muted)" }}>
              ALL FIELDS VALIDATED // READY TO COMMIT
            </span>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-6 md:px-8 py-3 font-mono text-xs font-bold tracking-widest rounded disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: submitting ? "var(--border)" : "var(--text-primary)",
              color: submitting ? "var(--text-muted)" : "var(--bg-primary)",
              border: "none",
            }}
          >
            {submitting ? "COMMITTING..." : "COMMIT EXECUTION"}
          </button>
        </div>
      </form>
    </div>
  );
}
