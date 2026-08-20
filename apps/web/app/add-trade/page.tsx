"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createTrade,
  tagTrade,
  createJournal,
  getJournalByDate,
  updateJournal,
  getJournalStreak,
  uploadTradeImage,
} from "@/lib/api";
import {
  searchSymbols,
  type Symbol as TickerSymbol,
} from "@/lib/api/watchlist";
import { Button } from "@/components/primitives/Button";
import { IconButton } from "@/components/primitives/IconButton";
import { NumberInput } from "@/components/primitives/NumberInput";
import { Badge } from "@/components/primitives/Badge";
import TagPicker, { type Tag } from "@/components/TagPicker";
import { useToast } from "@/components/Toast";

const MOODS = [
  { value: "euphoric", emoji: "🤩", color: "#22c55e" },
  { value: "confident", emoji: "😎", color: "#84cc16" },
  { value: "neutral", emoji: "😐", color: "#a1a1aa" },
  { value: "anxious", emoji: "😰", color: "#f59e0b" },
  { value: "frustrated", emoji: "😡", color: "#ef4444" },
] as const;

const INSTRUMENTS: { ticker: string; label: string }[] = [
  { ticker: "EURUSD", label: "Forex" },
  { ticker: "GBPUSD", label: "Forex" },
  { ticker: "GBPJPY", label: "Forex" },
  { ticker: "USDJPY", label: "Forex" },
  { ticker: "AUDUSD", label: "Forex" },
  { ticker: "BTCUSD", label: "Crypto" },
  { ticker: "XAUUSD", label: "Gold" },
  { ticker: "XAGUSD", label: "Silver" },
  { ticker: "US30", label: "Index" },
  { ticker: "NAS100", label: "Index" },
];

const CONTRACT_SIZES: Record<string, number> = {
  EURUSD: 10000,
  GBPUSD: 10000,
  GBPJPY: 10000,
  USDJPY: 10000,
  AUDUSD: 10000,
  BTCUSD: 1000,
  XAUUSD: 1000,
  XAGUSD: 1000,
  US30: 1000,
  ETHUSD: 1000,
  NAS100: 1000,
};

const KNOWN_TICKERS = new Set(INSTRUMENTS.map((i) => i.ticker));
const CUSTOM_SENTINEL = "__custom__";

type Direction = "LONG" | "SHORT";

const DRAFT_KEY = "tradezen-trade-draft";

interface TradeDraft {
  symbol: string;
  direction: Direction;
  entry: string;
  exit: string;
  quantity: string;
  stopLoss: string;
  takeProfit: string;
  commission: string;
  strategy: string;
  tradeDate: string;
  notes: string;
  fomoCheck: boolean;
  trendAlignment: boolean;
  vengeanceTrade: boolean;
  symbolContractSize: number | null;
  mood: string;
  preMarket: string;
  postMarket: string;
  lessons: string;
  chartPreview?: string;
  chartFileName?: string;
}

function isDraftEmpty(d: TradeDraft): boolean {
  return (
    !d.symbol &&
    !d.entry &&
    !d.exit &&
    !d.quantity &&
    !d.stopLoss &&
    !d.takeProfit &&
    !d.commission &&
    !d.strategy &&
    !d.notes &&
    !d.mood &&
    !d.preMarket &&
    !d.postMarket &&
    !d.lessons &&
    !d.chartPreview
  );
}

function dataURLToFile(dataUrl: string, fileName: string): File {
  const [meta, data] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(meta)?.[1] ?? "image/png";
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], fileName, { type: mime });
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-dim)",
  fontFamily: "var(--font-display)",
  marginBottom: 7,
  fontWeight: 600,
};

const panelStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border-soft)",
  borderRadius: 16,
  padding: 22,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
      }}
    >
      <span
        style={{
          width: 3,
          height: 13,
          borderRadius: 2,
          background: "var(--accent)",
        }}
      />
      <span
        style={{
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function RequiredMark() {
  return (
    <span
      style={{ color: "var(--accent-loss)", marginLeft: 3, fontWeight: 700 }}
    >
      *
    </span>
  );
}

export default function AddTradePage() {
  const router = useRouter();
  const { addToast } = useToast();

  // ── Trade fields ──
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<Direction>("LONG");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [commission, setCommission] = useState("");
  const [strategy, setStrategy] = useState("");
  const [tradeDate, setTradeDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [fomoCheck, setFomoCheck] = useState(false);
  const [trendAlignment, setTrendAlignment] = useState(false);
  const [vengeanceTrade, setVengeanceTrade] = useState(false);

  // ── Journal fields ──
  const [mood, setMood] = useState("");
  const [preMarket, setPreMarket] = useState("");
  const [postMarket, setPostMarket] = useState("");
  const [lessons, setLessons] = useState("");
  const [streak, setStreak] = useState<number | null>(null);

  // ── UI state ──
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [chartPreview, setChartPreview] = useState<string | null>(null);
  const [symbolContractSize, setSymbolContractSize] = useState<number | null>(
    null,
  );
  const [customMode, setCustomMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Draft (auto-save) state ──
  const [draftRestored, setDraftRestored] = useState(false);
  const saveReadyRef = useRef(false);
  const hydratingRef = useRef(false);

  // ── Symbol autocomplete ──
  const [symbolQuery, setSymbolQuery] = useState("");
  const [, setSymbolResults] = useState<TickerSymbol[]>([]);
  const [, setSymbolOpen] = useState(false);
  const symbolBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getJournalStreak()
      .then((s) => setStreak(s.currentStreak))
      .catch(() => {});
  }, []);

  // Prefill journal for the selected date
  useEffect(() => {
    let cancelled = false;
    getJournalByDate(tradeDate)
      .then((j) => {
        if (cancelled) return;
        // ponytail: one-shot guard so a restored draft's journal isn't clobbered
        if (hydratingRef.current) {
          hydratingRef.current = false;
          return;
        }
        if (!j) return;
        setMood(j.mood ?? "");
        setPreMarket(j.preMarket ?? "");
        setPostMarket(j.postMarket ?? "");
        setLessons(j.lessons ?? "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  // Debounced symbol search
  useEffect(() => {
    if (!symbolQuery.trim()) {
      setSymbolResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchSymbols(symbolQuery.trim())
        .then((res) => setSymbolResults(res.slice(0, 6)))
        .catch(() => setSymbolResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [symbolQuery]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        symbolBoxRef.current &&
        !symbolBoxRef.current.contains(e.target as Node)
      ) {
        setSymbolOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ── Auto-save draft (declared BEFORE restore so the mount-time save is gated) ──
  useEffect(() => {
    if (!saveReadyRef.current) return;
    const draft: TradeDraft = {
      symbol,
      direction,
      entry,
      exit,
      quantity,
      stopLoss,
      takeProfit,
      commission,
      strategy,
      tradeDate,
      notes,
      fomoCheck,
      trendAlignment,
      vengeanceTrade,
      symbolContractSize,
      mood,
      preMarket,
      postMarket,
      lessons,
      chartPreview: chartPreview ?? undefined,
      chartFileName: chartFile?.name,
    };
    const t = setTimeout(() => {
      try {
        if (isDraftEmpty(draft)) {
          localStorage.removeItem(DRAFT_KEY);
        } else {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
      } catch {
        // ponytail: quota exceeded (oversized image) — save text draft without the chart
        try {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({
              ...draft,
              chartPreview: undefined,
              chartFileName: undefined,
            }),
          );
        } catch {
          // ignore
        }
      }
    }, 400);
    return () => clearTimeout(t);
  }, [
    symbol,
    direction,
    entry,
    exit,
    quantity,
    stopLoss,
    takeProfit,
    commission,
    strategy,
    tradeDate,
    notes,
    fomoCheck,
    trendAlignment,
    vengeanceTrade,
    symbolContractSize,
    mood,
    preMarket,
    postMarket,
    lessons,
    chartPreview,
    chartFile,
  ]);

  // ── Restore draft on mount ──
  useEffect(() => {
    let draft: TradeDraft | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      draft = raw ? (JSON.parse(raw) as TradeDraft) : null;
    } catch {
      draft = null;
    }
    if (draft) {
      setSymbol(draft.symbol ?? "");
      setCustomMode(draft.symbol ? !KNOWN_TICKERS.has(draft.symbol) : false);
      setDirection(draft.direction === "SHORT" ? "SHORT" : "LONG");
      setEntry(draft.entry ?? "");
      setExit(draft.exit ?? "");
      setQuantity(draft.quantity ?? "");
      setStopLoss(draft.stopLoss ?? "");
      setTakeProfit(draft.takeProfit ?? "");
      setCommission(draft.commission ?? "");
      setStrategy(draft.strategy ?? "");
      setTradeDate(draft.tradeDate ?? new Date().toISOString().slice(0, 10));
      setNotes(draft.notes ?? "");
      setFomoCheck(draft.fomoCheck ?? false);
      setTrendAlignment(draft.trendAlignment ?? false);
      setVengeanceTrade(draft.vengeanceTrade ?? false);
      setSymbolContractSize(draft.symbolContractSize ?? null);
      setMood(draft.mood ?? "");
      setPreMarket(draft.preMarket ?? "");
      setPostMarket(draft.postMarket ?? "");
      setLessons(draft.lessons ?? "");
      if (draft.chartPreview) {
        setChartPreview(draft.chartPreview);
        setChartFile(
          dataURLToFile(
            draft.chartPreview,
            draft.chartFileName ?? "trade-chart.png",
          ),
        );
      }
      setDraftRestored(true);
      hydratingRef.current = true;
    }
    saveReadyRef.current = true;
  }, []);

  // ── Live P&L math ──
  const pnl = useMemo(() => {
    const e = parseFloat(entry);
    const x = parseFloat(exit);
    const q = parseFloat(quantity);
    const comm = parseFloat(commission) || 0;
    const cs = symbolContractSize ?? 100000;
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    const dir = direction === "LONG" ? 1 : -1;
    const valid = e > 0 && x > 0 && q > 0;
    const gross = valid ? (x - e) * q * cs * dir : 0;
    const net = gross - comm;
    const notional = valid ? e * q * cs : 0;
    const retPct = notional > 0 ? (net / notional) * 100 : 0;
    const riskPerUnit = sl > 0 ? Math.abs(e - sl) : 0;
    const rewardPerUnit = tp > 0 ? Math.abs(tp - e) : 0;
    const initialRisk = riskPerUnit * q * cs;
    const reward = rewardPerUnit * q * cs;
    const rMult = initialRisk > 0 ? net / initialRisk : 0;
    const rr =
      riskPerUnit > 0 && rewardPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0;
    return {
      valid,
      gross,
      net,
      notional,
      retPct,
      rMult,
      rr,
      initialRisk,
      reward,
      hasSL: sl > 0,
      hasTP: tp > 0,
      cs,
    };
  }, [
    entry,
    exit,
    quantity,
    commission,
    stopLoss,
    takeProfit,
    direction,
    symbolContractSize,
  ]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!symbol.trim()) e.symbol = "Instrument ticker is required.";
    if (!entry) e.entry = "Entry price is required.";
    if (!exit) e.exit = "Exit price is required.";
    if (!quantity) e.quantity = "Quantity is required.";
    return e;
  }, [symbol, entry, exit, quantity]);

  function handleChartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChartFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setChartPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeChart() {
    setChartFile(null);
    setChartPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetTradeFields() {
    setSymbol("");
    setCustomMode(false);
    setSymbolQuery("");
    setSymbolResults([]);
    setDirection("LONG");
    setEntry("");
    setExit("");
    setQuantity("");
    setStopLoss("");
    setTakeProfit("");
    setCommission("");
    setStrategy("");
    setNotes("");
    setFomoCheck(false);
    setTrendAlignment(false);
    setVengeanceTrade(false);
    setSymbolContractSize(null);
    setMood("");
    setPreMarket("");
    setPostMarket("");
    setLessons("");
    setSelectedTags([]);
    removeChart();
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setDraftRestored(false);
    resetTradeFields();
  }

  async function submitTrade(addAnother: boolean) {
    setError("");
    if (Object.keys(errors).length > 0) {
      setAttempted(true);
      setError(Object.values(errors)[0]);
      return;
    }
    setSubmitting(true);
    try {
      const created = await createTrade({
        symbol: symbol.trim().toUpperCase(),
        direction: direction === "LONG" ? "buy" : "sell",
        entry: parseFloat(entry),
        exit: parseFloat(exit),
        lot: parseFloat(quantity),
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
        commission: commission ? parseFloat(commission) : undefined,
        strategy: strategy.trim() || undefined,
        notes: notes.trim() || undefined,
        fomo_check: fomoCheck,
        trend_alignment: trendAlignment,
        vengeance_trade: vengeanceTrade,
        trade_date: tradeDate,
        contract_size: symbolContractSize,
      });
      const tradeId = (created as { id?: string })?.id;
      if (tradeId) {
        await Promise.all(selectedTags.map((t) => tagTrade(t.id, tradeId)));
        if (chartFile) await uploadTradeImage(tradeId, chartFile);
      }

      const hasJournal =
        mood || preMarket.trim() || postMarket.trim() || lessons.trim();
      if (hasJournal) {
        const journalData = {
          date: tradeDate,
          mood: mood || undefined,
          preMarket: preMarket.trim() || undefined,
          postMarket: postMarket.trim() || undefined,
          lessons: lessons.trim() || undefined,
        };
        await createJournal(journalData).catch((err) => {
          // ponytail: backend enforces one journal per date — upsert on 409
          if (String(err?.message ?? "").includes("409")) {
            return getJournalByDate(tradeDate).then((ex) =>
              updateJournal(ex.id, journalData),
            );
          }
        });
      }

      addToast("success", "Trade committed");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
      setDraftRestored(false);
      if (addAnother) {
        resetTradeFields();
        setSubmitting(false);
      } else {
        router.push("/trades");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save trade.");
      setSubmitting(false);
    }
  }

  function handleFormKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitTrade(false);
      return;
    }
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
    }
  }

  const pnlTone = pnl.net > 0 ? "profit" : pnl.net < 0 ? "loss" : "neutral";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      <div
        style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px 120px" }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            paddingBottom: 18,
            borderBottom: "1px solid var(--border-soft)",
            marginBottom: 28,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              NEW TRADE
            </h1>
            <p
              style={{
                color: "var(--text-dim)",
                fontSize: 13,
                margin: "4px 0 0",
              }}
            >
              Log the execution and capture the mindset behind it.
            </p>
          </div>
          {streak !== null && (
            <Badge
              tone="accent"
              style={{
                fontSize: 12,
                padding: "5px 12px",
                background: "transparent",
                border: "none",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 9999,
                  background: "var(--accent)",
                  boxShadow: "0 0 6px var(--accent)",
                }}
              />
              {streak}-DAY STREAK
            </Badge>
          )}
        </header>

        <form
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={handleFormKeyDown}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 380px",
              gap: 24,
              alignItems: "start",
            }}
          >
            {/* ── LEFT: TRADE ENTRY ── */}
            <div style={panelStyle}>
              <SectionTitle>Trade Entry</SectionTitle>

              {draftRestored && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 16,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--bg-primary)",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "var(--text-dim)" }}>
                    Restored unsaved draft
                  </span>
                  <button
                    type="button"
                    onClick={clearDraft}
                    style={{
                      color: "var(--accent)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontFamily: "var(--font-display)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    CLEAR
                  </button>
                </div>
              )}

              {/* Symbol + direction */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div ref={symbolBoxRef} style={{ position: "relative" }}>
                  <label style={labelStyle}>
                    Instrument
                    <RequiredMark />
                  </label>
                  <select
                    className="tz-input"
                    value={customMode ? CUSTOM_SENTINEL : symbol}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === CUSTOM_SENTINEL) {
                        setCustomMode(true);
                        setSymbol("");
                        return;
                      }
                      setCustomMode(false);
                      setSymbol(val);
                      setSymbolContractSize(CONTRACT_SIZES[val] ?? 100000);
                    }}
                    style={{
                      appearance: "none",
                      backgroundImage:
                        "url('data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D24%20height%3D24%20viewBox%3D0%200%2024%2024%20fill%3Dnone%20stroke%3D%23666%20strokeWidth%3D2%20strokeLinecap%3Dround%3E%3Cpath%20d%3D%22M6%209l6%206%20-6%206%22%20/%3E%3C/svg%3E')",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 12px center",
                      paddingRight: 30,
                    }}
                  >
                    <option value="">Select instrument</option>
                    {INSTRUMENTS.map((i) => (
                      <option key={i.ticker} value={i.ticker}>
                        {i.ticker} ({i.label})
                      </option>
                    ))}
                    <option value={CUSTOM_SENTINEL}>Other / custom…</option>
                  </select>
                  {customMode && (
                    <input
                      className="tz-input"
                      style={{ marginTop: 8 }}
                      value={symbol}
                      placeholder="Type ticker (e.g. AAPL)"
                      autoComplete="off"
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSymbol(val);
                        if (CONTRACT_SIZES[val])
                          setSymbolContractSize(CONTRACT_SIZES[val]);
                      }}
                    />
                  )}
                  {attempted && errors.symbol && (
                    <span
                      style={{
                        color: "var(--accent-loss)",
                        fontSize: 11,
                        marginTop: 4,
                        display: "block",
                      }}
                    >
                      {errors.symbol}
                    </span>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Direction</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["LONG", "SHORT"] as const).map((d) => {
                      const active = direction === d;
                      const color =
                        d === "LONG"
                          ? "var(--accent-profit)"
                          : "var(--accent-loss)";
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDirection(d)}
                          style={{
                            flex: 1,
                            padding: "9px",
                            borderRadius: 8,
                            border: `1px solid ${active ? color : "var(--border)"}`,
                            background: active ? color : "var(--bg-primary)",
                            color: active ? "#000" : "var(--text-muted)",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            cursor: "pointer",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Prices */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>
                    Entry
                    <RequiredMark />
                  </label>
                  <NumberInput
                    step="any"
                    value={entry}
                    placeholder="0.00"
                    onChange={(e) => setEntry(e.target.value)}
                  />
                  {attempted && errors.entry && (
                    <span style={{ color: "var(--accent-loss)", fontSize: 11 }}>
                      {errors.entry}
                    </span>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>
                    Exit
                    <RequiredMark />
                  </label>
                  <NumberInput
                    step="any"
                    value={exit}
                    placeholder="0.00"
                    onChange={(e) => setExit(e.target.value)}
                  />
                  {attempted && errors.exit && (
                    <span style={{ color: "var(--accent-loss)", fontSize: 11 }}>
                      {errors.exit}
                    </span>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>
                    Quantity
                    <RequiredMark />
                  </label>
                  <NumberInput
                    step="any"
                    value={quantity}
                    placeholder="0"
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  {attempted && errors.quantity && (
                    <span style={{ color: "var(--accent-loss)", fontSize: 11 }}>
                      {errors.quantity}
                    </span>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Contract Size</label>
                  <NumberInput
                    step="any"
                    value={symbolContractSize?.toString() || ""}
                    onChange={(e) =>
                      setSymbolContractSize(
                        e.target.value ? parseFloat(e.target.value) : null,
                      )
                    }
                    placeholder="auto (from symbol)"
                  />
                </div>
              </div>

              {/* SL / TP / Commission */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Stop Loss</label>
                  <NumberInput
                    step="any"
                    value={stopLoss}
                    placeholder="optional"
                    onChange={(e) => setStopLoss(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Take Profit</label>
                  <NumberInput
                    step="any"
                    value={takeProfit}
                    placeholder="optional"
                    onChange={(e) => setTakeProfit(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Commission</label>
                  <NumberInput
                    step="any"
                    value={commission}
                    placeholder="0.00"
                    onChange={(e) => setCommission(e.target.value)}
                  />
                </div>
              </div>

              {/* Strategy + date */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>Strategy</label>
                  <input
                    className="tz-input"
                    value={strategy}
                    placeholder="e.g. Breakout / Mean Reversion"
                    onChange={(e) => setStrategy(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Trade Date</label>
                  <input
                    className="tz-input"
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Psychology toggles */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Discipline Check</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    {
                      key: "fomo",
                      label: "FOMO",
                      on: fomoCheck,
                      set: setFomoCheck,
                      color: "var(--accent-loss)",
                    },
                    {
                      key: "revenge",
                      label: "REVENGE",
                      on: vengeanceTrade,
                      set: setVengeanceTrade,
                      color: "var(--accent-loss)",
                    },
                    {
                      key: "trend",
                      label: "TREND ALIGNED",
                      on: trendAlignment,
                      set: setTrendAlignment,
                      color: "var(--accent-profit)",
                    },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => p.set(!p.on)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 9999,
                        border: `1px solid ${p.on ? p.color : "var(--border)"}`,
                        background: p.on ? p.color : "var(--bg-surface-hover)",
                        color: p.on ? "#000" : "var(--text-muted)",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        cursor: "pointer",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  className="tz-input"
                  rows={3}
                  value={notes}
                  placeholder="Execution notes, context, what you saw…"
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Chart upload */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Chart Snapshot</label>
                {chartPreview ? (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      maxWidth: 280,
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={chartPreview}
                      alt="chart preview"
                      style={{ width: "100%", display: "block" }}
                    />
                    <IconButton
                      size={26}
                      onClick={removeChart}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                      }}
                      aria-label="Remove chart"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </IconButton>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "100%",
                      maxWidth: 280,
                      padding: "18px",
                      borderRadius: 10,
                      border: "1px dashed var(--border)",
                      background: "var(--bg-primary)",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    + Attach chart screenshot
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleChartChange}
                />
              </div>

              {/* Tags */}
              <div>
                <label style={labelStyle}>Tags</label>
                <TagPicker
                  selectedTags={selectedTags}
                  onChange={setSelectedTags}
                />
              </div>
            </div>

            {/* ── RIGHT: SUMMARY + JOURNAL ── */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                position: "sticky",
                top: 16,
              }}
            >
              {/* Live P&L */}
              <div style={panelStyle}>
                <SectionTitle>Live Outcome</SectionTitle>
                {pnl.valid ? (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--text-dim)",
                          marginBottom: 4,
                        }}
                      >
                        Net P&amp;L
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 30,
                          fontWeight: 700,
                          color:
                            pnlTone === "profit"
                              ? "var(--accent-profit)"
                              : pnlTone === "loss"
                                ? "var(--accent-loss)"
                                : "var(--text-primary)",
                        }}
                      >
                        {pnl.net >= 0 ? "+" : ""}
                        {fmtMoney(pnl.net)}
                      </div>
                      {symbol && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-dim)",
                            marginTop: 4,
                            letterSpacing: "0.03em",
                          }}
                        >
                          {symbol} · {direction} ·{" "}
                          {parseFloat(quantity).toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          lots × {pnl.cs.toLocaleString("en-US")} contract
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginBottom: 16,
                      }}
                    >
                      <Badge tone={pnlTone}>
                        {pnl.retPct >= 0 ? "+" : ""}
                        {pnl.retPct.toFixed(2)}% return
                      </Badge>
                      <Badge tone={pnlTone}>R {pnl.rMult.toFixed(2)}</Badge>
                      {pnl.hasSL && pnl.hasTP && (
                        <Badge tone="accent">R:R {pnl.rr.toFixed(2)}</Badge>
                      )}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <Metric label="Gross" value={fmtMoney(pnl.gross)} />
                      <Metric
                        label="Commission"
                        value={fmtMoney(parseFloat(commission) || 0)}
                      />
                      <Metric label="Notional" value={fmtMoney(pnl.notional)} />
                      <Metric
                        label="Contract Size"
                        value={pnl.cs.toLocaleString("en-US")}
                      />
                      {pnl.hasSL && (
                        <Metric
                          label="Initial Risk"
                          value={fmtMoney(pnl.initialRisk)}
                        />
                      )}
                      {pnl.hasTP && (
                        <Metric label="Reward" value={fmtMoney(pnl.reward)} />
                      )}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: "30px 16px",
                      border: "1px dashed var(--border)",
                      borderRadius: 12,
                      background: "var(--bg-primary)",
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-dim)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 3v18h18" />
                      <path d="m7 14 3-4 3 3 4-6" />
                    </svg>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-dim)",
                        marginTop: 10,
                        maxWidth: 220,
                        lineHeight: 1.5,
                      }}
                    >
                      Enter entry, exit and quantity to preview your P&amp;L,
                      R-multiple and risk:reward.
                    </div>
                  </div>
                )}
              </div>

              {/* Journal */}
              <div style={panelStyle}>
                <SectionTitle>Journal · {tradeDate}</SectionTitle>

                <label style={labelStyle}>Mood</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {MOODS.map((m) => {
                    const active = mood === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        title={m.value}
                        onClick={() => setMood(m.value)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          borderRadius: 8,
                          border: `1px solid ${active ? m.color : "var(--border)"}`,
                          background: active ? m.color : "var(--bg-primary)",
                          fontSize: 18,
                          cursor: "pointer",
                          filter: active ? "none" : "grayscale(0.5)",
                        }}
                      >
                        {m.emoji}
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Pre-Market</label>
                  <textarea
                    className="tz-input"
                    rows={2}
                    value={preMarket}
                    placeholder="Plan, bias, levels…"
                    onChange={(e) => setPreMarket(e.target.value)}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Post-Market</label>
                  <textarea
                    className="tz-input"
                    rows={2}
                    value={postMarket}
                    placeholder="What happened vs plan…"
                    onChange={(e) => setPostMarket(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Lessons</label>
                  <textarea
                    className="tz-input"
                    rows={2}
                    value={lessons}
                    placeholder="What to repeat / avoid…"
                    onChange={(e) => setLessons(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky action bar */}
          <div
            style={{
              position: "sticky",
              bottom: 0,
              marginTop: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
              padding: "14px 18px",
              background: "var(--bg-glass)",
              backdropFilter: "blur(10px)",
              border: "1px solid var(--border-soft)",
              borderRadius: 12,
              boxShadow: "0 -8px 24px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ marginRight: "auto" }}>
              {error ? (
                <span style={{ color: "var(--accent-loss)", fontSize: 12 }}>
                  {error}
                </span>
              ) : (
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>
                  Ctrl / ⌘ + Enter to commit
                </span>
              )}
            </div>
            <Button
              variant="subtle"
              onClick={() => submitTrade(true)}
              disabled={submitting}
            >
              SAVE &amp; ADD ANOTHER
            </Button>
            <Button
              variant="primary"
              onClick={() => submitTrade(false)}
              disabled={submitting}
            >
              {submitting ? "COMMITTING…" : "COMMIT TRADE"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border-soft)",
        borderRadius: 8,
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
