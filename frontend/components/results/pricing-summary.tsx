import { ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatTravelPrice } from "@/lib/currency";
import type { TripEstimate } from "@/lib/pricing/estimate-trip";
import type { Currency } from "@/lib/wizard/types";
import { cn } from "@/lib/utils";

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "KES", label: "KSh" },
  { code: "USD", label: "USD" },
];

export function PricingSummary({
  estimate,
  onCurrencyChange,
}: {
  estimate: TripEstimate;
  onCurrencyChange?: (currency: Currency) => void;
}) {
  const { lines, total, currency, notes } = estimate;

  return (
    <Card className="p-8 md:p-10 border border-outline-variant/15 sunset-gradient text-white">
      <div className="flex items-start justify-between gap-6">
        <div>
          <span
            id="estimate-heading"
            className="text-white/70 font-headline font-bold text-xs tracking-widest uppercase"
          >
            Your Estimate
          </span>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight mt-2">
            All-in pricing
          </h2>
          <p className="text-white/80 text-sm mt-2 max-w-md">
            Priced from our partner hotels&apos; contract rates for your
            dates. We&apos;ll confirm the final quote with your concierge once
            you submit your details.
          </p>
        </div>

        {onCurrencyChange && (
          <div
            role="radiogroup"
            aria-label="Show prices in"
            className="shrink-0 inline-flex rounded-full bg-black/20 p-1"
          >
            {CURRENCIES.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={currency === code}
                onClick={() => onCurrencyChange(code)}
                className={cn(
                  "px-4 h-9 rounded-full text-xs font-bold tracking-wide transition-colors",
                  currency === code
                    ? "bg-white text-[#9e3d00]"
                    : "text-white/80 hover:text-white"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ul className="mt-10 space-y-3">
        {lines.map((line) => (
          <li
            key={line.label}
            className="flex items-center justify-between text-white/90 border-b border-white/10 pb-3"
          >
            <span className="text-sm">
              {line.label}
              {line.detail && (
                <span className="block text-xs text-white/60 mt-0.5">
                  {line.detail}
                </span>
              )}
            </span>
            <span className="font-bold tabular-nums">
              {formatTravelPrice(line.amount, currency)}
            </span>
          </li>
        ))}
      </ul>

      {notes.length > 0 && (
        <ul className="mt-5 space-y-1 text-xs text-white/70">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <div className="flex items-end justify-between mt-8 pt-6 border-t border-white/20">
        <div>
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
            Total
          </p>
          <p className="font-headline font-extrabold text-4xl md:text-5xl mt-1 tabular-nums">
            {formatTravelPrice(total, currency)}
          </p>
        </div>

        <div
          className="hidden sm:inline-flex items-center gap-2 text-white/80 text-xs font-semibold uppercase tracking-widest"
          aria-hidden
        >
          Next: your details
          <ArrowDown className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
