"use client";

import { useSettings } from "../context/SettingsContext";
import { NumberInput } from "@/components/primitives/NumberInput";

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
        <NumberInput
          className="input-glass"
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
    </div>
  );
}
