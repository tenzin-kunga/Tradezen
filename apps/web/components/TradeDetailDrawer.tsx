"use client";

import { useEffect, useRef, useState } from "react";
import type { Trade } from "@tradezen/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getTradeImages,
  updateTrade,
  uploadTradeImage,
  deleteTradeImage,
  tagTrade,
  untagTrade,
  getTagsForTrade,
  type TradeImageDto,
} from "@/lib/api";
import { getTradingSession } from "@/lib/session";
import NumberInput from "@/components/primitives/NumberInput";
import TagPicker, { type Tag } from "@/components/TagPicker";
import { ImageLightbox } from "./ImageLightbox";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n >= 0 ? `+$${abs}` : `-$${abs}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "--";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "--";
  return dt.toISOString().replace("T", " ").slice(0, 16);
}

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TradeDetailDrawer({
  trade,
  open,
  onClose,
  onSaved,
  onDelete,
}: {
  trade: Trade | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (id: string) => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [images, setImages] = useState<TradeImageDto[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const initialTagIdsRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    symbol: "",
    direction: "LONG" as "LONG" | "SHORT",
    entry: "",
    exit: "",
    lotSize: "",
    stopLoss: "",
    takeProfit: "",
    commission: "",
    tradeDate: "",
    strategy: "",
    notes: "",
    fomoCheck: false,
    trendAlignment: false,
    vengeanceTrade: false,
  });

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setConfirming(false);
      setSaveError("");
    }
  }, [open]);

  if (!trade) return null;

  const isWin = trade.pnl >= 0;
  const isLong = trade.direction === "buy";
  const imageUrl =
    trade.previewImage?.url ?? (trade.chartImage ? `${API}${trade.chartImage}` : null);
  const session = getTradingSession(trade.tradeDate ?? trade.createdAt);

  function startEdit() {
    setSaveError("");
    setEditing(true);
    setForm({
      symbol: trade.symbol,
      direction: trade.direction === "buy" ? "LONG" : "SHORT",
      entry: String(trade.entryPrice),
      exit: String(trade.exitPrice),
      lotSize: String(trade.lotSize),
      stopLoss: trade.stopLoss != null ? String(trade.stopLoss) : "",
      takeProfit: trade.takeProfit != null ? String(trade.takeProfit) : "",
      commission: trade.commission != null ? String(trade.commission) : "0",
      tradeDate: toLocalInput(trade.tradeDate ?? trade.createdAt),
      strategy: trade.strategy ?? "",
      notes: trade.notes ?? "",
      fomoCheck: trade.fomoCheck,
      trendAlignment: trade.trendAlignment,
      vengeanceTrade: trade.vengeanceTrade,
    });
    setImages([]);
    setSelectedTags([]);
    setEditLoading(true);
    Promise.all([
      getTradeImages(trade.id),
      getTagsForTrade(trade.id),
    ])
      .then(([imgs, tags]) => {
        setImages(imgs);
        setSelectedTags(tags);
        initialTagIdsRef.current = new Set(tags.map((t) => t.id));
      })
      .catch(() => {})
      .finally(() => setEditLoading(false));
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageUpload(file: File) {
    try {
      const img = await uploadTradeImage(trade.id, file);
      setImages((prev) => [...prev, { ...img, width: null, height: null, displayOrder: prev.length }]);
    } catch {
      setSaveError("Failed to upload screenshot.");
    }
  }

  async function handleImageDelete(imageId: string) {
    try {
      await deleteTradeImage(trade.id, imageId);
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    } catch {
      setSaveError("Failed to delete screenshot.");
    }
  }

  async function handleSave() {
    setSaveError("");
    if (!form.symbol.trim()) {
      setSaveError("INSTRUMENT TICKER is required.");
      return;
    }
    if (!form.entry || !form.exit || !form.lotSize) {
      setSaveError("Entry price, exit price, and quantity are required.");
      return;
    }
    setSaving(true);
    try {
      await updateTrade(trade.id, {
        symbol: form.symbol.trim().toUpperCase(),
        direction: form.direction === "LONG" ? "buy" : "sell",
        entry: parseFloat(form.entry),
        exit: parseFloat(form.exit),
        lot: parseFloat(form.lotSize),
        stop_loss: form.stopLoss ? parseFloat(form.stopLoss) : undefined,
        take_profit: form.takeProfit ? parseFloat(form.takeProfit) : undefined,
        commission: form.commission ? parseFloat(form.commission) : undefined,
        trade_date: form.tradeDate ? new Date(form.tradeDate).toISOString() : null,
        strategy: form.strategy.trim() || undefined,
        notes: form.notes.trim() || undefined,
        fomo_check: form.fomoCheck,
        trend_alignment: form.trendAlignment,
        vengeance_trade: form.vengeanceTrade,
      });
      const currentIds = new Set(selectedTags.map((t) => t.id));
      const toAdd = selectedTags.filter((t) => !initialTagIdsRef.current.has(t.id));
      const toRemove = Array.from(initialTagIdsRef.current).filter(
        (id) => !currentIds.has(id),
      );
      await Promise.all([
        ...toAdd.map((t) => tagTrade(t.id, trade.id)),
        ...toRemove.map((id) => untagTrade(id, trade.id)),
      ]);
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Update failed.");
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && editing) {
      e.preventDefault();
      void handleSave();
    }
  }

  const headerActions = editing ? (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => setEditing(false)}
        className="btn-glass text-xs"
        style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
      >
        CANCEL
      </button>
      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="btn-primary text-xs"
      >
        {saving ? "SAVING..." : "SAVE"}
      </button>
    </div>
  ) : (
    <div className="flex gap-2 items-center">
      <button onClick={startEdit} className="btn-primary text-xs">
        EDIT
      </button>
      <button
        onClick={() => setConfirming(true)}
        className="btn-glass text-xs"
        style={{
          color: "var(--accent-loss)",
          borderColor: "var(--accent-loss)",
        }}
      >
        DELETE
      </button>
      <button
        onClick={onClose}
        aria-label="Close"
        className="btn-glass text-xs p-1.5 leading-none"
        style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setConfirming(false);
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/50 backdrop-blur-md"
        className={`${editing ? "sm:max-w-2xl" : "sm:max-w-md"} w-full max-h-[90vh] overflow-hidden gap-0 !p-0`}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-2xl)",
        }}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader
          className="border-b px-4 py-3 shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm font-bold tracking-wider">
              {editing ? "EDIT TRADE" : trade.symbol}
            </DialogTitle>
            {headerActions}
          </div>
          {!editing && (
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] font-semibold tracking-widest px-1.5 py-0.5 rounded"
                style={{
                  background: isWin
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.15)",
                  color: isWin ? "var(--accent-profit)" : "var(--accent-loss)",
                }}
              >
                {isWin ? "WIN" : "LOSS"}
              </span>
              <span
                className="mono-data font-semibold text-xs"
                style={{
                  color: isWin ? "var(--accent-profit)" : "var(--accent-loss)",
                }}
              >
                {fmt(Number(trade.pnl))}
              </span>
            </div>
          )}
        </DialogHeader>

        <div
          className="flex flex-col gap-4 p-4 overflow-y-auto min-h-0"
          onKeyDown={handleKeyDown}
        >
          {editing ? (
            <EditForm
              form={form}
              set={set}
              loading={editLoading}
              saving={saving}
              error={saveError}
              images={images}
              onUpload={handleImageUpload}
              onDeleteImage={handleImageDelete}
              fileInputRef={fileInputRef}
              selectedTags={selectedTags}
              setSelectedTags={setSelectedTags}
              onOpenLightbox={() => setLightboxOpen(true)}
            />
          ) : (
            <>
              {imageUrl && (
                <div
                  className="rounded overflow-hidden cursor-zoom-in"
                  style={{ border: "1px solid var(--border)" }}
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={imageUrl}
                    alt="Trade chart"
                    className="w-full object-cover"
                    style={{ maxHeight: 240 }}
                  />
                </div>
              )}

              {confirming && (
                <div
                  className="rounded p-3 flex flex-col gap-3"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid var(--accent-loss)",
                  }}
                >
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Permanently delete this trade?
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirming(false)}
                      className="btn-glass text-xs"
                      style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => onDelete(trade.id)}
                      className="btn-primary text-xs"
                      style={{ background: "var(--accent-loss)" }}
                    >
                      CONFIRM DELETE
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field label="ENTRY" value={String(trade.entryPrice)} mono />
                <Field label="EXIT" value={String(trade.exitPrice)} mono />
                <Field
                  label="STOP LOSS"
                  value={trade.stopLoss != null ? String(trade.stopLoss) : "--"}
                  mono
                />
                <Field
                  label="TAKE PROFIT"
                  value={trade.takeProfit != null ? String(trade.takeProfit) : "--"}
                  mono
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="LOT SIZE" value={String(trade.lotSize)} />
                <Field
                  label="COMMISSION"
                  value={`$${Number(trade.commission ?? 0).toFixed(2)}`}
                />
                <Field label="DIRECTION" value={isLong ? "LONG" : "SHORT"} />
                <Field
                  label="DATE"
                  value={fmtDate(trade.tradeDate ?? trade.createdAt)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="R:R"
                  value={trade.riskReward != null ? String(trade.riskReward) : "--"}
                  mono
                />
                <Field label="SESSION" value={session === "--" ? "--" : session} />
              </div>

              {trade.strategy && (
                <div>
                  <div className="label-caps mb-1">STRATEGY</div>
                  <div className="text-sm font-semibold">{trade.strategy}</div>
                </div>
              )}

              {(trade.fomoCheck ||
                trade.trendAlignment ||
                trade.vengeanceTrade) && (
                <div>
                  <div className="label-caps mb-2">PSYCHOLOGY</div>
                  <div className="flex flex-col gap-1.5">
                    {trade.fomoCheck && <PsychologyLabel label="FOMO ENTRY" />}
                    {trade.trendAlignment && (
                      <PsychologyLabel label="TREND ALIGNED" positive />
                    )}
                    {trade.vengeanceTrade && (
                      <PsychologyLabel label="VENGEANCE TRADE" />
                    )}
                  </div>
                </div>
              )}

              {trade.notes && (
                <div>
                  <div className="label-caps mb-1">NOTES</div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}
                  >
                    {trade.notes}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>

      {imageUrl && (
        <ImageLightbox
          tradeId={trade.id}
          previewImage={{ url: imageUrl }}
          imageCount={editing ? Math.max(images.length, 1) : trade.imageCount ?? 1}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </Dialog>
  );
}

function EditForm({
  form,
  set,
  loading,
  saving,
  error,
  images,
  onUpload,
  onDeleteImage,
  fileInputRef,
  selectedTags,
  setSelectedTags,
  onOpenLightbox,
}: {
  form: {
    symbol: string;
    direction: "LONG" | "SHORT";
    entry: string;
    exit: string;
    lotSize: string;
    stopLoss: string;
    takeProfit: string;
    commission: string;
    tradeDate: string;
    strategy: string;
    notes: string;
    fomoCheck: boolean;
    trendAlignment: boolean;
    vengeanceTrade: boolean;
  };
  set: <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => void;
  loading: boolean;
  saving: boolean;
  error: string;
  images: TradeImageDto[];
  onUpload: (file: File) => void;
  onDeleteImage: (imageId: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  selectedTags: Tag[];
  setSelectedTags: (tags: Tag[]) => void;
  onOpenLightbox: () => void;
}) {
  const input = () => "w-full tz-input"; // ponytail: shared input styling

  function togglePill(
    active: boolean,
    onClick: () => void,
    label: string,
    positive?: boolean,
  ) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="btn-glass text-xs"
        style={{
          color: active
            ? positive
              ? "var(--accent-profit)"
              : "var(--accent-warn)"
            : "var(--text-muted)",
          borderColor: active
            ? positive
              ? "var(--accent-profit)"
              : "var(--accent-warn)"
            : "var(--border)",
          background: active ? "color-mix(in srgb, currentColor 10%, transparent)" : "transparent",
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          className="rounded p-3 text-xs"
          style={{
            color: "var(--accent-loss)",
            border: "1px solid var(--accent-loss)",
            background: "rgba(239,68,68,0.08)",
          }}
        >
          {error}
        </div>
      )}

      {/* Screenshots */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="label-caps">SCREENSHOTS</div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-glass text-xs"
            style={{ color: "var(--accent)", borderColor: "var(--border)" }}
          >
            + ADD SCREENSHOT
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </div>
        {loading ? (
          <div className="text-xs text-text-dim">Loading screenshots...</div>
        ) : images.length === 0 ? (
          <div className="text-xs text-text-dim">No screenshots.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="relative rounded overflow-hidden cursor-zoom-in group"
                style={{ border: "1px solid var(--border)", aspectRatio: "16/9" }}
                onClick={onOpenLightbox}
              >
                <img
                  src={img.thumbnailUrl || img.url}
                  alt="Trade screenshot"
                  className="w-full h-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute top-1 left-1 text-[8px] font-bold tracking-widest px-1 py-0.5 rounded"
                    style={{ background: "rgba(0,0,0,0.7)", color: "var(--accent)" }}
                  >
                    THUMB
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage(img.id);
                  }}
                  aria-label="Delete screenshot"
                  className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.7)", color: "var(--accent-loss)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Symbol + Direction */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="label-caps mb-1">INSTRUMENT TICKER</div>
          <input
            value={form.symbol}
            onChange={(e) => set("symbol", e.target.value)}
            placeholder="EURUSD"
            className={input()}
          />
        </div>
        <div>
          <div className="label-caps mb-1">DIRECTION</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set("direction", "LONG")}
              className="btn-glass text-xs flex-1"
              style={{
                color: form.direction === "LONG" ? "var(--accent-profit)" : "var(--text-muted)",
                borderColor: form.direction === "LONG" ? "var(--accent-profit)" : "var(--border)",
                background: form.direction === "LONG" ? "color-mix(in srgb, var(--accent-profit) 12%, transparent)" : "transparent",
              }}
            >
              LONG
            </button>
            <button
              type="button"
              onClick={() => set("direction", "SHORT")}
              className="btn-glass text-xs flex-1"
              style={{
                color: form.direction === "SHORT" ? "var(--accent-loss)" : "var(--text-muted)",
                borderColor: form.direction === "SHORT" ? "var(--accent-loss)" : "var(--border)",
                background: form.direction === "SHORT" ? "color-mix(in srgb, var(--accent-loss) 12%, transparent)" : "transparent",
              }}
            >
              SHORT
            </button>
          </div>
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <div className="label-caps mb-1">ENTRY</div>
          <NumberInput step="any" value={form.entry} onChange={(e) => set("entry", e.target.value)} placeholder="1.0850" />
        </div>
        <div>
          <div className="label-caps mb-1">EXIT</div>
          <NumberInput step="any" value={form.exit} onChange={(e) => set("exit", e.target.value)} placeholder="1.0900" />
        </div>
        <div>
          <div className="label-caps mb-1">LOT SIZE</div>
          <NumberInput step="any" value={form.lotSize} onChange={(e) => set("lotSize", e.target.value)} placeholder="0.10" />
        </div>
        <div>
          <div className="label-caps mb-1">STOP LOSS</div>
          <NumberInput step="any" value={form.stopLoss} onChange={(e) => set("stopLoss", e.target.value)} placeholder="1.0800" />
        </div>
        <div>
          <div className="label-caps mb-1">TAKE PROFIT</div>
          <NumberInput step="any" value={form.takeProfit} onChange={(e) => set("takeProfit", e.target.value)} placeholder="1.0950" />
        </div>
        <div>
          <div className="label-caps mb-1">COMMISSION</div>
          <NumberInput step="any" value={form.commission} onChange={(e) => set("commission", e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* Date + Strategy */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="label-caps mb-1">DATE</div>
          <input
            type="datetime-local"
            value={form.tradeDate}
            onChange={(e) => set("tradeDate", e.target.value)}
            className={input()}
            style={{ colorScheme: "dark" }}
          />
        </div>
        <div>
          <div className="label-caps mb-1">STRATEGY</div>
          <input
            value={form.strategy}
            onChange={(e) => set("strategy", e.target.value)}
            placeholder="Breakout"
            className={input()}
          />
        </div>
      </div>

      {/* Psychology */}
      <div>
        <div className="label-caps mb-2">PSYCHOLOGY</div>
        <div className="flex flex-wrap gap-2">
          {togglePill(form.fomoCheck, () => set("fomoCheck", !form.fomoCheck), "FOMO ENTRY")}
          {togglePill(form.trendAlignment, () => set("trendAlignment", !form.trendAlignment), "TREND ALIGNED", true)}
          {togglePill(form.vengeanceTrade, () => set("vengeanceTrade", !form.vengeanceTrade), "VENGEANCE TRADE")}
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="label-caps mb-2">TAGS</div>
        <TagPicker selectedTags={selectedTags} onChange={setSelectedTags} />
      </div>

      {/* Notes */}
      <div>
        <div className="label-caps mb-1">NOTES</div>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Notes..."
          className={`${input()} min-h-[100px]`}
        />
      </div>

      {saving && (
        <div className="text-xs text-text-dim">Saving...</div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="glass-card p-2.5">
      <div className="label-caps mb-0.5">{label}</div>
      <div
        className={
          mono ? "mono-data font-semibold text-sm" : "font-semibold text-sm"
        }
      >
        {value}
      </div>
    </div>
  );
}

function PsychologyLabel({
  label,
  positive,
}: {
  label: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: positive ? "var(--accent-profit)" : "var(--accent-warn)",
          flexShrink: 0,
        }}
      />
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
