"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { updateSettings } from "@/lib/api";
import { NotificationPreferences } from "@/components/NotificationPreferences";

const THEMES = ["dark", "light", "midnight", "tradingview"] as const;
type Theme = (typeof THEMES)[number];

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  const [initialCapital, setInitialCapital] = useState("");
  const [defaultLotSize, setDefaultLotSize] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current != null) {
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      setInitialCapital(user.initial_capital?.toString() ?? "0");
      setDefaultLotSize(user.default_lot_size?.toString() ?? "0.01");
      setTimezone(user.timezone ?? "UTC");
      if (user.theme && THEMES.includes(user.theme as Theme)) {
        setTheme(user.theme as Theme);
      }
    }
  }, [user, setTheme]);

  async function handleSave() {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await updateSettings({
        initial_capital: parseFloat(initialCapital) || 0,
        default_lot_size: parseFloat(defaultLotSize) || 0.01,
        timezone,
        theme,
      });
      setSaved(true);
      if (savedTimerRef.current != null) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        savedTimerRef.current = null;
        setSaved(false);
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border rounded px-3 py-2.5 text-sm outline-none box-border focus:border-[#22d3ee]";
  const inputStyle = { fontFamily: "var(--font-mono)" };
  const labelCls = "block text-xs tracking-widest mb-1.5";
  const sectionCls = "border rounded p-4 md:p-5 mb-4";

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-10" style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-widest m-0">
            SETTINGS
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: "var(--text-muted)" }}>
            SYSTEM_CONFIG // USER PREFERENCES
          </p>
        </div>
      </div>

      {/* Profile Info */}
      <div className={sectionCls} style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
          01 // ACCOUNT PROFILE
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>USERNAME</label>
            <div className={`${inputCls} cursor-not-allowed`} style={{ ...inputStyle, backgroundColor: "var(--bg-panel)", color: "var(--text-muted)" }}>
              {user?.username?.toUpperCase() || "--"}
            </div>
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>EMAIL</label>
            <div className={`${inputCls} cursor-not-allowed`} style={{ ...inputStyle, backgroundColor: "var(--bg-panel)", color: "var(--text-muted)" }}>
              {user?.email || "--"}
            </div>
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>MEMBER SINCE</label>
            <div className={`${inputCls} cursor-not-allowed`} style={{ ...inputStyle, backgroundColor: "var(--bg-panel)", color: "var(--text-muted)" }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "--"}
            </div>
          </div>
        </div>
      </div>

      {/* Capital & Trading Defaults */}
      <div className={sectionCls} style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
          02 // TRADING PARAMETERS
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>INITIAL CAPITAL ($)</label>
            <input
              className={`${inputCls} bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border)]`}
              type="number"
              step="any"
              min="0"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              placeholder="10000"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Starting account balance for P&L tracking
            </p>
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>DEFAULT LOT SIZE</label>
            <input
              className={`${inputCls} bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border)]`}
              type="number"
              step="any"
              min="0"
              value={defaultLotSize}
              onChange={(e) => setDefaultLotSize(e.target.value)}
              placeholder="0.01"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Pre-filled lot size on new trades
            </p>
          </div>
        </div>
        <div>
          <label className={labelCls} style={{ color: "var(--text-muted)" }}>TIMEZONE</label>
          <select
            className={`${inputCls} bg-[var(--bg-primary)] text-[var(--text-primary)] border-[var(--border)] cursor-pointer`}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={inputStyle}
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Chicago">America/Chicago (CST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="Europe/Berlin">Europe/Berlin (CET)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
          </select>
        </div>
      </div>

      {/* Appearance */}
      <div className={sectionCls} style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
          03 // APPEARANCE
        </div>
        <div>
          <label className={labelCls} style={{ color: "var(--text-muted)" }}>INTERFACE THEME</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["dark", "light", "midnight", "tradingview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className="py-3 text-xs font-bold tracking-widest border cursor-pointer transition-all rounded"
                style={{
                  borderColor: theme === t ? "var(--accent-cyan)" : "var(--border)",
                  backgroundColor: theme === t ? "var(--bg-surface-hover)" : "var(--bg-primary)",
                  color: theme === t ? "var(--text-primary)" : "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {t === "dark" ? "◼ DARK" : t === "light" ? "◻ LIGHT" : t === "midnight" ? "◈ MIDNIGHT" : "▣ TRADINGVIEW"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Management */}
      <div className={sectionCls} style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="text-xs tracking-widest mb-4" style={{ color: "var(--text-dim)" }}>
          04 // RISK MANAGEMENT
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>MAX RISK PER TRADE (%)</label>
            <div className={`${inputCls} cursor-not-allowed`} style={{ ...inputStyle, backgroundColor: "var(--bg-panel)", color: "var(--text-muted)" }}>
              2.00
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Coming soon
            </p>
          </div>
          <div>
            <label className={labelCls} style={{ color: "var(--text-muted)" }}>MAX DAILY DRAWDOWN (%)</label>
            <div className={`${inputCls} cursor-not-allowed`} style={{ ...inputStyle, backgroundColor: "var(--bg-panel)", color: "var(--text-muted)" }}>
              5.00
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Coming soon
            </p>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className={sectionCls}>
        <h2 className="text-sm font-bold tracking-widest mb-4">NOTIFICATION PREFERENCES</h2>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Choose which alerts and reminders you want to receive
        </p>
        <NotificationPreferences />
      </div>

      {/* Save bar */}
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 md:px-5 md:py-4 border rounded"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        {error ? (
          <span className="text-sm tracking-wide" style={{ color: "var(--accent-loss)" }}>{error}</span>
        ) : saved ? (
          <span className="text-sm tracking-wide" style={{ color: "var(--accent-profit)" }}>SETTINGS SAVED SUCCESSFULLY</span>
        ) : (
          <span className="text-xs tracking-wide" style={{ color: "var(--text-dim)" }}>
            MODIFY PARAMETERS // SAVE TO PERSIST
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 text-xs font-bold tracking-widest rounded transition-colors disabled:cursor-not-allowed"
          style={{
            backgroundColor: saving ? "var(--border)" : "var(--text-primary)",
            color: saving ? "var(--text-muted)" : "var(--bg-primary)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {saving ? "SAVING..." : "SAVE SETTINGS"}
        </button>
      </div>
    </div>
  );
}
