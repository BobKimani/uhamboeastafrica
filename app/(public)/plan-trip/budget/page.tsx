"use client";

import { WizardShell } from "@/components/wizard/wizard-shell";
import { useWizard } from "@/lib/wizard/store";
import { Currency } from "@/lib/wizard/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CURRENCIES: Currency[] = ["USD", "KES", "EUR"];

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
          <div className="grid grid-cols-3 gap-3">
            {CURRENCIES.map((c) => {
              const selected = currency === c;
              return (
                <button
                  key={c}
                  onClick={() =>
                    update({ budget: { ...state.budget, currency: c } })
                  }
                  className={cn(
                    "h-12 rounded-xl font-headline font-bold text-sm bg-surface-container-highest text-on-surface transition-all",
                    selected && "sunset-gradient text-white"
                  )}
                >
                  {c}
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
                {formatCurrency(min, currency)}
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={20000}
              step={100}
              value={min}
              onChange={(e) =>
                update({
                  budget: { ...state.budget, min: Number(e.target.value) },
                })
              }
              className="w-full accent-[#9e3d00]"
            />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Maximum
              </span>
              <span className="font-headline font-bold text-primary">
                {formatCurrency(max, currency)}
              </span>
            </div>
            <input
              type="range"
              min={Math.max(min, 500)}
              max={50000}
              step={100}
              value={max}
              onChange={(e) =>
                update({
                  budget: { ...state.budget, max: Number(e.target.value) },
                })
              }
              className="w-full accent-[#9e3d00]"
            />
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
