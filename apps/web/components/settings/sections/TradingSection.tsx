"use client";

import { useSettings } from "../context/SettingsContext";
import { DisabledField } from "../components/DisabledField";

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Chicago", label: "America/Chicago (CST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
];

function FieldRow({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "var(--label)",
          fontWeight: 500,
          color: "var(--text-muted)",
          marginBottom: "var(--space-1)",
        }}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          style={{
            fontSize: "var(--meta)",
            color: "var(--accent-loss)",
            marginTop: "var(--space-1)",
          }}
        >
          {error}
        </p>
      ) : description ? (
        <p
          style={{
            fontSize: "var(--meta)",
            color: "var(--text-dim)",
            marginTop: "var(--space-1)",
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function TradingSection() {
  const { values, update, validationErrors } = useSettings();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      <FieldRow
        label="Starting Account Balance"
        description="Baseline for performance tracking"
        error={validationErrors.initial_capital}
      >
        <input
          className="input-glass"
          type="number"
          step="any"
          min="0"
          value={values.initial_capital}
          onChange={(e) =>
            update("initial_capital", parseFloat(e.target.value) || 0)
          }
          placeholder="10000"
          style={{ width: "100%" }}
        />
      </FieldRow>

      <FieldRow
        label="Default Position Size"
        description="Pre-filled when logging new trades"
        error={validationErrors.default_lot_size}
      >
        <input
          className="input-glass"
          type="number"
          step="any"
          min="0"
          value={values.default_lot_size}
          onChange={(e) =>
            update("default_lot_size", parseFloat(e.target.value) || 0.01)
          }
          placeholder="0.01"
          style={{ width: "100%" }}
        />
      </FieldRow>

      <FieldRow
        label="Timezone"
        description="Used for session tracking and daily resets"
      >
        <select
          className="select-glass"
          value={values.timezone}
          onChange={(e) => update("timezone", e.target.value)}
          style={{ width: "100%" }}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </FieldRow>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          paddingTop: "var(--space-4)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <DisabledField
          label="Maximum Risk Per Trade (%)"
          value="2.00"
          status="planned"
          description="Used for coaching and alerts"
        />
        <DisabledField
          label="Maximum Daily Drawdown (%)"
          value="5.00"
          status="planned"
          description="Triggers discipline notifications"
        />
      </div>
    </div>
  );
}
