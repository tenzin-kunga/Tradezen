import type { ChangeEvent, InputHTMLAttributes } from "react";

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  step?: number | string;
}

function Stepper({
  dir,
  onClick,
  disabled,
}: {
  dir: 1 | -1;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === 1 ? "Increment" : "Decrement"}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        background: "transparent",
        color: "var(--text-dim)",
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        borderRadius: 4,
        transition: "color 0.12s var(--ease-out)",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-dim)";
      }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dir === 1 ? (
          <path d="m6 15 6-6 6 6" />
        ) : (
          <path d="m6 9 6 6 6-6" />
        )}
      </svg>
    </button>
  );
}

export function NumberInput({
  step = 1,
  className = "",
  style,
  onChange,
  value,
  min,
  max,
  disabled,
  ...rest
}: NumberInputProps) {
  function resolveStep(): number {
    if (typeof step === "number") return step;
    const s = typeof step === "string" ? parseFloat(step) : NaN;
    if (!isNaN(s) && step !== "any") return s;
    // ponytail: step="any" → adapt to the field's own precision
    const m = String(value).match(/\.(\d+)/);
    if (m) return Math.pow(10, -m[1].length);
    return 1;
  }

  function stepBy(dir: 1 | -1) {
    if (disabled) return;
    const s = resolveStep();
    const cur = parseFloat(String(value));
    const base = isNaN(cur) ? 0 : cur;
    let next = base + dir * s;
    const maxN = typeof max === "string" ? parseFloat(max) : max;
    const minN = typeof min === "string" ? parseFloat(min) : min;
    if (maxN !== undefined && !isNaN(maxN)) next = Math.min(next, maxN);
    if (minN !== undefined && !isNaN(minN)) next = Math.max(next, minN);
    onChange?.({ target: { value: String(next) } } as unknown as ChangeEvent<HTMLInputElement>);
  }

  return (
    <div style={{ position: "relative", display: "block" }}>
      <input
        {...rest}
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={onChange}
        className={className || "tz-input"}
        style={{ ...style, paddingRight: 30 }}
      />
      <div
        style={{
          position: "absolute",
          right: 4,
          top: 4,
          bottom: 4,
          width: 20,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Stepper dir={1} onClick={() => stepBy(1)} disabled={disabled} />
        <Stepper dir={-1} onClick={() => stepBy(-1)} disabled={disabled} />
      </div>
    </div>
  );
}

export default NumberInput;
