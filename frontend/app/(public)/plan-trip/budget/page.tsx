"use client";

import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { Currency } from "@/lib/wizard/types";
import { formatTravelPrice, USD_TO_KES } from "@/lib/currency";
import { cn } from "@/lib/utils";

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "USD", label: "USD ($)" },
  { code: "KES", label: "KSh" },
];

// KSh 200,000 and KSh 1,500,000 expressed in USD (internal unit), floored to step
const MIN_CAP = Math.floor(200_000 / USD_TO_KES / 100) * 100;   // 1500
const MAX_CAP = Math.floor(1_500_000 / USD_TO_KES / 100) * 100; // 11500

export default function BudgetStep() {
  const { state, update } = useWizard();
  const { currency, min, max } = state.budget;
  return (
    <WizardShell
      stepSlug="budget"
      title="Set your tempo"
      subtitle="A rough guide helps us match the right lodges and vehicles to your trip."
    >
      <div className="max-w-2xl mx-auto bg-surface-container-low rounded-2xl p-8 md:p-10">
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Currency
          </div>
          <div className="grid grid-cols-2 gap-3">
            {CURRENCIES.map(({ code, label }) => {
              const selected = currency === code;
              return (
                <button
                  key={code}
                  onClick={() =>
                    update({ budget: { ...state.budget, currency: code } })
                  }
                  className={cn(
                    "h-12 rounded-xl font-headline font-bold text-sm bg-surface-container-highest text-on-surface transition-all",
                    selected && "sunset-gradient text-white"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Minimum
              </span>
              <span className="font-headline font-bold text-primary">
                {formatTravelPrice(min, currency)}
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={MIN_CAP}
              step={100}
              value={min}
              onChange={(e) =>
                update({
                  budget: { ...state.budget, min: Number(e.target.value) },
                })
              }
              className="w-full accent-primary"
            />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Maximum
              </span>
              <span className="font-headline font-bold text-primary">
                {formatTravelPrice(max, currency)}
              </span>
            </div>
            <input
              type="range"
              min={Math.max(min, 500)}
              max={MAX_CAP}
              step={100}
              value={max}
              onChange={(e) =>
                update({
                  budget: { ...state.budget, max: Number(e.target.value) },
                })
              }
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
