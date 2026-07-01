import type { ReactNode } from "react";
import { OptionCard } from "./OptionCard";

type OptionGroupOption<T extends string> = {
  value: T;
  label: string;
  preview: ReactNode;
  disabled?: boolean;
  disabledReason?: string;
};

type OptionCardGroupProps<T extends string> = {
  options: OptionGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function OptionCardGroup<T extends string>({
  options,
  value,
  onChange,
}: OptionCardGroupProps<T>) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-3)",
      }}
    >
      {options.map((opt) => (
        <OptionCard
          key={opt.value}
          selected={value === opt.value}
          label={opt.label}
          preview={opt.preview}
          onSelect={() => onChange(opt.value)}
          disabled={opt.disabled}
          disabledReason={opt.disabledReason}
        />
      ))}
    </div>
  );
}
