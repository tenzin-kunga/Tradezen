"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import {
  getTrade,
  updateTrade,
  uploadTradeImage,
  getTagsForTrade,
  tagTrade,
  untagTrade,
} from "@/lib/api";
import TagPicker from "@/components/TagPicker";
import type { Tag } from "@/components/TagPicker";

function RRDisplay({
  entry,
  stopLoss,
  takeProfit,
}: {
  entry: string;
  stopLoss: string;
  takeProfit: string;
}) {
  const e = parseFloat(entry);
  const sl = parseFloat(stopLoss);
  const tp = parseFloat(takeProfit);
  if (!e || !sl || !tp || Math.abs(e - sl) === 0)
    return <span style={{ color: "#555" }}>--</span>;
  const risk = Math.abs(e - sl);
  const reward = Math.abs(tp - e);
  const rr = reward / risk;
  return (
    <div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: rr >= 2 ? "#22c55e" : rr >= 1 ? "#e8603c" : "#ef4444",
        }}
      >
        1:{rr.toFixed(2)}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "#888",
          marginTop: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <span>
          RISK AMT: <span style={{ color: "#fff" }}>{risk.toFixed(4)}</span>
        </span>
        <span>
          MAX REWARD:{" "}
          <span style={{ color: "#22c55e" }}>{reward.toFixed(4)}</span>
        </span>
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
      <span
        style={{
          fontSize: "11px",
          letterSpacing: "0.1em",
          color: value ? "#ffffff" : "#888888",
        }}
      >
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

interface TradeImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  displayOrder: number;
}

export default function EditTradePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const params = useParams();
  const tradeId = params.id as string;

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
  const [submitting, setSubmitting] = useState(false);
  const [loadingTrade, setLoadingTrade] = useState(true);
  const [error, setError] = useState("");
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const initialTagIdsRef = useRef<Set<string>>(new Set());
  const imageInputRef = useRef<HTMLInputElement>(null);

  // New image gallery state
  const [images, setImages] = useState<TradeImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    getTagsForTrade(tradeId)
      .then((tags) => {
        setSelectedTags(tags);
        initialTagIdsRef.current = new Set(tags.map((t: Tag) => t.id));
      })
      .catch(() => {});
    getTrade(tradeId)
      .then((t: any) => {
        setSymbol(t.symbol || "");
        setDirection(t.direction === "sell" ? "SHORT" : "LONG");
        setEntry(t.entry_price?.toString() || t.entry?.toString() || "");
        setExit(t.exit_price?.toString() || t.exit?.toString() || "");
        setQuantity(t.lot?.toString() || t.quantity?.toString() || "");
        setStopLoss(t.stop_loss?.toString() || "");
        setTakeProfit(t.take_profit?.toString() || "");
        setStrategy(t.strategy || "");
        setNotes(t.notes || "");
        setFomoCheck(!!t.fomo_check);
        setTrendAlignment(!!t.trend_alignment);
        setVengeanceTrade(!!t.vengeance_trade);

        // Support both new images array and legacy chart_image
        if (t.images && t.images.length > 0) {
          setImages(t.images);
          setChartImage(t.images[0].thumbnailUrl);
        } else if (t.chart_image) {
          setChartImage(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${t.chart_image}`,
          );
        }
      })
      .catch((err: any) => setError(err.message || "Failed to load trade"))
      .finally(() => setLoadingTrade(false));
  }, [tradeId]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChartFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setChartImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      await uploadTradeImage(tradeId, file);
      // Reload trade to get updated images
      const updatedTrade = await getTrade(tradeId);
      if (updatedTrade.images) {
        setImages(updatedTrade.images);
        if (updatedTrade.images.length > 0) {
          setChartImage(updatedTrade.images[0].thumbnailUrl);
        }
      }
      addToast("success", "Image uploaded");
    } catch (err: unknown) {
      addToast("error", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

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
      await updateTrade(tradeId, {
        symbol: symbol.trim().toUpperCase(),
        direction: direction === "LONG" ? "buy" : "sell",
        entry: parseFloat(entry),
        exit: parseFloat(exit),
        lot: parseFloat(quantity),
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
        strategy: strategy.trim() || undefined,
        notes: notes.trim() || undefined,
        fomo_check: fomoCheck,
        trend_alignment: trendAlignment,
        vengeance_trade: vengeanceTrade,
      });
      if (chartFile) {
        await uploadTradeImage(tradeId, chartFile);
      }
      const currentIds = new Set(selectedTags.map((t) => t.id));
      const toAdd = selectedTags.filter(
        (t) => !initialTagIdsRef.current.has(t.id),
      );
      const toRemove = Array.from(initialTagIdsRef.current).filter(
        (id) => !currentIds.has(id),
      );
      await Promise.all([
        ...toAdd.map((t) => tagTrade(t.id, tradeId)),
        ...toRemove.map((id) => untagTrade(id, tradeId)),
      ]);
      addToast("success", "Trade updated");
      router.push("/trades");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed.");
      setSubmitting(false);
    }
  }

  if (loadingTrade) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#111111",
          color: "#555",
          fontFamily: "monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: "12px", letterSpacing: "0.15em" }}>
          LOADING TRADE DATA...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#111111",
        color: "#ffffff",
        fontFamily: "monospace",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              margin: 0,
            }}
          >
            EDIT EXECUTION
          </h1>
          <p
            style={{
              fontSize: "11px",
              color: "#555",
              margin: "4px 0 0",
              letterSpacing: "0.05em",
            }}
          >
            MODIFY_PROTOCOL // UPDATE LEDGER ENTRY
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "1px solid #2a2a2a",
            borderRadius: "4px",
            color: "#888",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "11px",
            letterSpacing: "0.1em",
            padding: "8px 16px",
          }}
        >
          ← CANCEL
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: "16px",
          }}
        >
          {/* Left column */}
          <div>
            {/* Section 01: Instrument */}
            <div style={sectionStyle}>
              <div
                style={{
                  fontSize: "10px",
                  color: "#555",
                  letterSpacing: "0.15em",
                  marginBottom: "16px",
                }}
              >
                01 // INSTRUMENT PARAMETERS
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
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
                          backgroundColor:
                            direction === d
                              ? d === "LONG"
                                ? "#ffffff"
                                : "#ef4444"
                              : "#111111",
                          color:
                            direction === d
                              ? d === "LONG"
                                ? "#000000"
                                : "#ffffff"
                              : "#888888",
                          borderRadius:
                            d === "LONG" ? "4px 0 0 4px" : "0 4px 4px 0",
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <label style={labelStyle}>ENTRY PRICE</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={entry}
                    onChange={(e) => setEntry(e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>EXIT PRICE</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={exit}
                    onChange={(e) => setExit(e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>QUANTITY / LOT SIZE</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.01"
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <label style={labelStyle}>STOP LOSS</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>TAKE PROFIT</label>
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    placeholder="0.00000"
                  />
                </div>
              </div>
            </div>

            {/* Section 02: Strategy + Notes */}
            <div style={sectionStyle}>
              <div
                style={{
                  fontSize: "10px",
                  color: "#555",
                  letterSpacing: "0.15em",
                  marginBottom: "16px",
                }}
              >
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
              <div style={{ marginBottom: "12px" }}>
                <label style={labelStyle}>TAGS</label>
                <TagPicker
                  selectedTags={selectedTags}
                  onChange={setSelectedTags}
                />
              </div>
              <div>
                <label style={labelStyle}>TRADE NOTES</label>
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: "120px",
                    resize: "vertical",
                  }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your rationale, setup context, market conditions..."
                />
              </div>

              {/* Chart Image Gallery */}
              <div style={{ marginTop: "12px" }}>
                <label style={labelStyle}>SCREENSHOTS ({images.length})</label>

                {/* Image Grid */}
                {images.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(120px, 1fr))",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    {images.map((image, index) => (
                      <div
                        key={image.id}
                        style={{
                          position: "relative",
                          borderRadius: "4px",
                          overflow: "hidden",
                          border:
                            index === 0
                              ? "2px solid #22c55e"
                              : "1px solid #2a2a2a",
                        }}
                      >
                        <img
                          src={image.thumbnailUrl}
                          alt={`Screenshot ${index + 1}`}
                          style={{
                            width: "100%",
                            height: "80px",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        {index === 0 && (
                          <div
                            style={{
                              position: "absolute",
                              top: "4px",
                              left: "4px",
                              background: "#22c55e",
                              color: "#000",
                              fontSize: "8px",
                              padding: "2px 4px",
                              borderRadius: "2px",
                              fontWeight: 700,
                            }}
                          >
                            THUMBNAIL
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("Delete this screenshot?")) {
                              try {
                                const API =
                                  process.env.NEXT_PUBLIC_API_URL ||
                                  "http://localhost:3001";
                                await fetch(
                                  `${API}/trades/${tradeId}/images/${image.id}`,
                                  {
                                    method: "DELETE",
                                    headers: {
                                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                                    },
                                  },
                                );
                                setImages(
                                  images.filter((img) => img.id !== image.id),
                                );
                                addToast("success", "Image deleted");
                              } catch {
                                addToast("error", "Failed to delete image");
                              }
                            }
                          }}
                          style={{
                            position: "absolute",
                            top: "4px",
                            right: "4px",
                            background: "rgba(0,0,0,0.7)",
                            border: "none",
                            borderRadius: "2px",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "10px",
                            padding: "2px 4px",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  style={{
                    background: "transparent",
                    border: "1px dashed #2a2a2a",
                    borderRadius: "4px",
                    color: "#888",
                    cursor: uploadingImage ? "not-allowed" : "pointer",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    padding: "10px 20px",
                    width: "100%",
                  }}
                >
                  {uploadingImage ? "UPLOADING..." : "+ ADD SCREENSHOT"}
                </button>
              </div>
            </div>

            {/* Section 03: Behavioral flags */}
            <div style={sectionStyle}>
              <div
                style={{
                  fontSize: "10px",
                  color: "#555",
                  letterSpacing: "0.15em",
                  marginBottom: "16px",
                }}
              >
                03 // BEHAVIORAL FLAGS
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <TogglePill
                  label="FOMO ENTRY — entered without valid setup confirmation"
                  value={fomoCheck}
                  onChange={setFomoCheck}
                />
                <TogglePill
                  label="TREND ALIGNMENT — trade aligns with higher-timeframe bias"
                  value={trendAlignment}
                  onChange={setTrendAlignment}
                />
                <TogglePill
                  label="VENGEANCE TRADE — entered to recover from previous loss"
                  value={vengeanceTrade}
                  onChange={setVengeanceTrade}
                />
              </div>
            </div>
          </div>

          {/* Right column: RR panel */}
          <div>
            <div style={{ ...sectionStyle, position: "sticky", top: "40px" }}>
              <div
                style={{
                  fontSize: "10px",
                  color: "#555",
                  letterSpacing: "0.15em",
                  marginBottom: "16px",
                }}
              >
                LIVE R:R CALCULATOR
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#888",
                    letterSpacing: "0.1em",
                    marginBottom: "8px",
                  }}
                >
                  RISK/REWARD RATIO
                </div>
                <RRDisplay
                  entry={entry}
                  stopLoss={stopLoss}
                  takeProfit={takeProfit}
                />
              </div>

              {/* Confidence bars */}
              <div
                style={{ borderTop: "1px solid #2a2a2a", paddingTop: "16px" }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    color: "#555",
                    letterSpacing: "0.12em",
                    marginBottom: "12px",
                  }}
                >
                  CONFIDENCE METRICS
                </div>
                {[
                  { label: "SETUP QUALITY", pct: trendAlignment ? 80 : 40 },
                  {
                    label: "RISK DISCIPLINE",
                    pct: fomoCheck || vengeanceTrade ? 20 : stopLoss ? 85 : 50,
                  },
                  {
                    label: "PROTOCOL SCORE",
                    pct: Math.round(
                      (((trendAlignment ? 1 : 0) +
                        (!fomoCheck ? 1 : 0) +
                        (!vengeanceTrade ? 1 : 0) +
                        (stopLoss ? 1 : 0) +
                        (takeProfit ? 1 : 0)) /
                        5) *
                        100,
                    ),
                  },
                ].map((bar) => (
                  <div key={bar.label} style={{ marginBottom: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ fontSize: "10px", color: "#888" }}>
                        {bar.label}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          color:
                            bar.pct >= 70
                              ? "#22c55e"
                              : bar.pct >= 40
                                ? "#e8603c"
                                : "#ef4444",
                        }}
                      >
                        {bar.pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: "3px",
                        backgroundColor: "#2a2a2a",
                        borderRadius: "2px",
                      }}
                    >
                      <div
                        style={{
                          height: "3px",
                          borderRadius: "2px",
                          width: `${bar.pct}%`,
                          backgroundColor:
                            bar.pct >= 70
                              ? "#22c55e"
                              : bar.pct >= 40
                                ? "#e8603c"
                                : "#ef4444",
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
            <span
              style={{
                fontSize: "12px",
                color: "#ef4444",
                letterSpacing: "0.05em",
              }}
            >
              {error}
            </span>
          ) : (
            <span
              style={{
                fontSize: "11px",
                color: "#555",
                letterSpacing: "0.08em",
              }}
            >
              MODIFY MODE // CHANGES WILL OVERWRITE
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
            }}
          >
            {submitting ? "UPDATING..." : "UPDATE EXECUTION"}
          </button>
        </div>
      </form>
    </div>
  );
}
