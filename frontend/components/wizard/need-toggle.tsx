"use client";

import { cn } from "@/lib/utils";

/** Two-option switch: "I need X" / "Skip". */
export function NeedToggle({
  needed,
  onChange,
  needLabel,
  skipLabel,
  skipDisabled,
  skipDisabledHint,
}: {
  needed: boolean;
  onChange: (needed: boolean) => void;
  needLabel: string;
  skipLabel: string;
  skipDisabled?: boolean;
  skipDisabledHint?: string;
}) {
  const options = [
    { value: true, label: needLabel, disabled: false },
    { value: false, label: skipLabel, disabled: !!skipDisabled },
  ];
  return (
    <div className="max-w-3xl mx-auto w-full">
      <div
        role="radiogroup"
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 rounded-2xl bg-surface-container-low"
      >
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={needed === o.value}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-12 rounded-xl text-sm font-headline font-bold transition-all text-on-surface-variant hover:text-on-surface disabled:opacity-40 disabled:pointer-events-none",
              needed === o.value && "sunset-gradient text-white hover:text-white"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {skipDisabled && skipDisabledHint && (
        <p className="text-xs text-on-surface-variant mt-2 text-center">
          {skipDisabledHint}
        </p>
      )}
    </div>
  );
}
