"use client";

import { cn } from "@/lib/utils";
import type { DisplayCurrency } from "@/lib/currency";

const OPTIONS: { value: DisplayCurrency; label: string }[] = [
  { value: "KES", label: "Ksh" },
  { value: "USD", label: "USD" },
];

export function CurrencyToggle({
  currency,
  onChange,
  className,
}: {
  currency: DisplayCurrency;
  onChange: (currency: DisplayCurrency) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center rounded-xl border border-outline-variant/20 bg-surface-container-low p-1",
        className
      )}
      aria-label="Currency"
    >
      {OPTIONS.map((option) => {
        const active = currency === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 min-w-14 rounded-lg px-3 text-xs font-bold uppercase tracking-wide transition-colors",
              active
                ? "sunset-gradient text-white shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            )}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
