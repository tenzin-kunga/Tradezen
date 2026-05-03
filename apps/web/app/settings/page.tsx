"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { updateSettings } from "@/lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--bg-primary)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  padding: "10px 12px",
  color: "var(--text-primary)",
  fontFamily: "monospace",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--text-muted)",
  letterSpacing: "0.12em",
  marginBottom: "6px",
  display: "block",
};

const sectionStyle: React.CSSProperties = {
  backgroundColor: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  padding: "20px",
  marginBottom: "16px",
};

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
      if (user.theme === "light" || user.theme === "dark") {
        setTheme(user.theme);
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

  return (
    <div style={{ minHeight: "100vh", color: "var(--text-primary)", fontFamily: "monospace" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.1em", margin: 0 }}>
            SETTINGS
          </h1>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0", letterSpacing: "0.05em" }}>
            SYSTEM_CONFIG // USER PREFERENCES
          </p>
        </div>
      </div>

      {/* Profile Info */}
      <div style={sectionStyle}>
        <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", marginBottom: "16px" }}>
          01 // ACCOUNT PROFILE
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>USERNAME</label>
            <div style={{ ...inputStyle, backgroundColor: "var(--bg-panel)", color: "var(--text-muted)", cursor: "not-allowed" }}>
              {user?.username?.toUpperCase() || "--"}
            </div>
          </div>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <div style={{ ...inputStyle, backgroundColor: "var(--bg-panel)", color: "var(--text-muted)", cursor: "not-allowed" }}>
              {user?.email || "--"}
            </div>
          </div>
          <div>
            <label style={labelStyle}>MEMBER SINCE</label>
            <div style={{ ...inputStyle, backgroundColor: "var(--bg-panel)", color: "var(--text-muted)", cursor: "not-allowed" }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "--"}
            </div>
          </div>
        </div>
      </div>

      {/* Capital & Trading Defaults */}
      <div style={sectionStyle}>
        <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", marginBottom: "16px" }}>
          02 // TRADING PARAMETERS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <div>
            <label style={labelStyle}>INITIAL CAPITAL ($)</label>
            <input
              style={inputStyle}
              type="number"
              step="any"
              min="0"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              placeholder="10000"
            />
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
              Starting account balance for P&L tracking
            </p>
          </div>
          <div>
            <label style={labelStyle}>DEFAULT LOT SIZE</label>
            <input
              style={inputStyle}
              type="number"
              step="any"
              min="0"
              value={defaultLotSize}
              onChange={(e) => setDefaultLotSize(e.target.value)}
              placeholder="0.01"
            />
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
              Pre-filled lot size on new trades
            </p>
          </div>
        </div>
        <div>
          <label style={labelStyle}>TIMEZONE</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
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
      <div style={sectionStyle}>
        <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", marginBottom: "16px" }}>
          03 // APPEARANCE
        </div>
        <div>
          <label style={labelStyle}>INTERFACE THEME</label>
          <div style={{ display: "flex", gap: "0" }}>
            {(["dark", "light"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                style={{
                  flex: 1,
                  padding: "12px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  backgroundColor: theme === t ? (t === "dark" ? "#ffffff" : "#111111") : "var(--bg-primary)",
                  color: theme === t ? (t === "dark" ? "#000000" : "#ffffff") : "var(--text-muted)",
                  borderRadius: t === "dark" ? "4px 0 0 4px" : "0 4px 4px 0",
                  transition: "all 0.15s",
                }}
              >
                {t === "dark" ? "◼ DARK MODE" : "◻ LIGHT MODE"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Management */}
      <div style={sectionStyle}>
        <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", marginBottom: "16px" }}>
          04 // RISK MANAGEMENT
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>MAX RISK PER TRADE (%)</label>
            <div style={{ ...inputStyle, color: "var(--text-muted)" }}>
              2.00
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
              Coming soon
            </p>
          </div>
          <div>
            <label style={labelStyle}>MAX DAILY DRAWDOWN (%)</label>
            <div style={{ ...inputStyle, color: "var(--text-muted)" }}>
              5.00
            </div>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
              Coming soon
            </p>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {error ? (
          <span style={{ fontSize: "12px", color: "#ef4444", letterSpacing: "0.05em" }}>{error}</span>
        ) : saved ? (
          <span style={{ fontSize: "12px", color: "#22c55e", letterSpacing: "0.05em" }}>SETTINGS SAVED SUCCESSFULLY</span>
        ) : (
          <span style={{ fontSize: "11px", color: "#555", letterSpacing: "0.08em" }}>
            MODIFY PARAMETERS // SAVE TO PERSIST
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? "#333" : "#ffffff",
            color: saving ? "#888" : "#000000",
            border: "none",
            borderRadius: "4px",
            padding: "12px 32px",
            fontFamily: "monospace",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            cursor: saving ? "not-allowed" : "pointer",
            transition: "background-color 0.15s",
          }}
        >
          {saving ? "SAVING..." : "SAVE SETTINGS"}
        </button>
      </div>
    </div>
  );
}
